'use strict';
import moment from 'moment';

// Content script file will run in the context of web page.
// With content script you can manipulate the web pages using
// Document Object Model (DOM).
// You can also pass information to the parent extension.

// We execute this script by making an entry in manifest.json file
// under `content_scripts` property

// For more information on Content Scripts,
// See https://developer.chrome.com/extensions/content_scripts

// Log `title` of current active web page
// const pageTitle = document.head.getElementsByTagName('title')[0].innerHTML;
// console.log(
//   `Page title is: '${pageTitle}' - evaluated by Chrome extension's 'contentScript.js' file`
// );

// // Communicate with background file by sending a message
// chrome.runtime.sendMessage(
//   {
//     type: 'GREETINGS',
//     payload: {
//       message: 'Hello, my name is Con. I am from ContentScript.',
//     },
//   },
//   (response) => {
//     console.log(response.message);
//   }
// );

// Listen for message
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'EXTRACT') {
    const val = runExtract(request.payload);
    sendResponse(val);
    return true;
  } else if (request.type === 'GET_DATA') {
    const val = getWeekAndYear();
    sendResponse(val);
    return true;
  }

  sendResponse({});
  return true;
});

function getWeekAndYear() {
  try {
    const week = +document.querySelectorAll('span.header-2-0-2')[0].textContent.split('-')[0];
    const year = +document.querySelectorAll('span.header-2-0-4')[0].textContent.split(' ')[2];
    return { week, year };
  } catch (error) {
    console.error('Could not get the initial values from the document', error);
    return { week: 1, year: new Date.year() }
  }
}

function runExtract({ first_week, current_year }) {
  const events = [];
  const eventTypes = [];

  if (!first_week || first_week < 1 || first_week > 52) {
    return { eventTypes, events, error: 'First week is invalid or not given. Try a number between 1 and 52.'};
  }

  if (!current_year || current_year < 2000 || current_year > 9999) {
    return { eventTypes, events, error: 'Current year is invalid.'};
  }

  const arrayRange = (start, stop, step) => Array.from(
    { length: (stop - start) / step + 1 },
    (_, index) => start + index * step
  );

  const getWeeks = (date) => {
    const ret = [];
    const dates = date.includes(',') ? date.split(',') : [date];
    dates.forEach(untrimmed => {
      const d = untrimmed.trim();
      if (d.includes('-')) ret.push(...arrayRange(+d.split('-')[0], +d.split('-')[1], 1));
      else ret.push(+d);
    });

    return ret;
  }

  const days = document.querySelectorAll('span.labelone');
  if (days.length !== 5) {
    console.error('The table does not contain all and only weekdays.', Array.from(days).map(x => x.innerText));
    return { events, eventTypes, error: 'Days are not all and only weekdays. Contact the creator.'};
  }

  const tables = document.querySelectorAll('table.spreadsheet');
  tables.forEach((table, tableIdx) => {
    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
      if (row.classList.contains('columnTitles')) return;
      const cols = row.querySelectorAll('td');
      const type = cols[1].textContent.trim();

      if (!eventTypes.includes(type))
        eventTypes.push(type);

      const weeks = getWeeks(cols[7].textContent);
      const weekday = tableIdx + 1;

      weeks.forEach(week => {
        const year = week > first_week ? current_year : current_year + 1;
        const startDate = moment(`${year}W${week.toString().padStart(2, '0')}${weekday}`);
        events.push({
          start: [startDate.year(), startDate.month() + 1, startDate.date(), +cols[5].textContent.split(':')[0], +cols[5].textContent.split(':')[1]],
          end: [startDate.year(), startDate.month() + 1, startDate.date(), +cols[6].textContent.split(':')[0], +cols[6].textContent.split(':')[1]],
          title: `[${type}] ` + cols[0].textContent,
          description: cols[9].textContent,
          location: cols[8].textContent,
        });
      });
    });
  });
  return { eventTypes, events };
}

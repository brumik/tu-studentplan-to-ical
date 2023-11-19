'use strict';

import './popup.css';
import * as ics from 'ics';

function onLoad () {
  function getInitialValues() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length < 1) return;

      const tab = tabs[0];

      chrome.tabs.sendMessage(
        tab.id,
        {
          type: 'GET_DATA',
        },
        (payload) => {
          if (!payload) {
            document.getElementById('error').innerText = 'The page is not a timetable. (If it is try to reload or contact the developer)';
            document.getElementById('extractBtn').disabled = true;
            return;
          }

          const { week, year } = payload;
          document.getElementById('first-week').value = week;
          document.getElementById('current-year').value = year;
          document.getElementById('error').innerText = '';
        }
      );
    });
  };  

  function runExtract() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];

      chrome.tabs.sendMessage(
        tab.id,
        {
          type: 'EXTRACT',
          payload: {
            first_week: +document.getElementById("first-week").value,
            current_year: +document.getElementById("current-year").value,
          }
        },
        ({ events, eventTypes, error}) => {
          if (error && error.length > 0) {
            document.getElementById('error').innerText = error;
          }

          ics.createEvents(events, (error, value) => {
            if (error) console.log('error', error);
            else chrome.downloads.download({ 
              filename: 'events/all-events.ics',
              url: "data:text/calendar," + value,
            }); 
          });
          if (document.getElementById("enable-types").checked && eventTypes.length > 1) {
            eventTypes.forEach(type => {
              ics.createEvents(events.filter(item => item.title.startsWith(`[${type}] `)), (error, value) => {
                if (error) console.log('errcor', error);
                else chrome.downloads.download({ 
                  filename: `events/${type}-events.ics`,
                  url: "data:text/calendar," + value,
                }); 
              });
            });
          }
        }
      );
    });
  }

  // Call this every time the popup is opened.
  getInitialValues();
  document.getElementById('extractBtn').addEventListener('click', () => {
    runExtract();
  });
  document.addEventListener('DOMContentLoaded', setup);

  // // Communicate with background file by sending a message
  // chrome.runtime.sendMessage(
  //   {
  //     type: 'GREETINGS',
  //     payload: {
  //       message: 'Hello, my name is Pop. I am from Popup.',
  //     },
  //   },
  //   (response) => {
  //     console.log(response.message);
  //   }
  // );
};

window.onload = onLoad;
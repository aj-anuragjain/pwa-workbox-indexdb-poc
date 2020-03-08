const container = document.getElementById('container');
const offlineMessage = document.getElementById('offline');
const noDataMessage = document.getElementById('no-data');
const dataSavedMessage = document.getElementById('data-saved');
const saveErrorMessage = document.getElementById('save-error');
const addEventButton = document.getElementById('add-event-button');

// TODO - register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log(`Service Worker registered! Scope: ${registration.scope}`);
      })
      .catch(err => {
        console.log(`Service Worker registration failed: ${err}`);
      });
  });
}

addEventButton.addEventListener('click', addAndPostEvent);

if('Notification' in window) {
  Notification.requestPermission();
}

// Network Calls
loadContentNetworkFirst();

// TODO - create indexedDB database
const dbPromise = createIndexedDB();


function createIndexedDB() {
  if(!('indexedDB' in window)) {
    return null;
  }

  return idb.open('dashboardr', 1, (upgradeDb) => {
    if(!upgradeDb.objectStoreNames.contains('events')){
      const eventsOS = upgradeDb.createObjectStore('events', {keyPath: 'id'});
    }
  });
}

function saveEventDataLocally(events) {
  if(!('indexedDB' in window)) {
    return null;
  }

  return dbPromise.then((db) => {
    const tx = db.transaction('events', 'readwrite');
    const store = tx.objectStore('events');
    return Promise.all(events.map(evt => store.put(evt)))
      .catch((err) => {
        tx.abort();
        throw Error('Events were never added to the store');
      });
  })
}

function deleteEventDataLocally(id) {
  if(!('indexedDB' in window)) {
    return null;
  }

  return dbPromise.then((db) => {
    const tx = db.transaction('events', 'readwrite');
    const store = tx.objectStore('events');
    return store.delete(id);
  })
}

function getLocalEventData() {
  if(!('indexedDB' in window)) {
    return null;
  }

  return dbPromise.then(db => {
    const tx = db.transaction('events', 'readonly');
    const store = tx.objectStore('events');
    return store.getAll();
  });
}


function loadContentNetworkFirst() {
  getServerData()
  .then(dataFromNetwork => {
    updateUI(dataFromNetwork);
    saveEventDataLocally(dataFromNetwork)
      .then(() => {
        setLastUpdated(new Date());
        messageDataSaved();
      })
      .catch((err) => {
        messageSaveError();
        console.warn(err);
      });
  }).catch(err => { // if we can't connect to the server...
    console.log('Network requests have failed, this is expected if offline');
    getLocalEventData().then((offlineData) => {
      if(!offlineData) {
        messageNoData();
      } else {
        messageOffline();
        updateUI(offlineData);
      }
    })
  });
}

/* Network functions */

function getServerData() {
  return fetch('api/getAll').then(response => {
    if (!response.ok) {
      throw Error(response.statusText);
    }
    return response.json();
  });
}

function addAndPostEvent(e) {
  e.preventDefault();
  const data = {
    id: Date.now(),
    title: document.getElementById('title').value,
    date: document.getElementById('date').value,
    city: document.getElementById('city').value,
    note: document.getElementById('note').value
  };
  updateUI([data]);

  // TODO - save event data locally
  saveEventDataLocally([data]);

  const headers = new Headers({'Content-Type': 'application/json'});
  const body = JSON.stringify(data);
  return fetch('api/add', {
    method: 'POST',
    headers: headers,
    body: body
  });
}

function deleteEvent(id) {
  getLocalEventData().then((offlineData) => {
    const index = offlineData.findIndex(el => el.id == id);
    if(index != -1){
      getData = deleteEventDataLocally(id)
        .then((data) => {
          const headers = new Headers({'Content-Type': 'application/json'});
          const body = JSON.stringify(data);
          return fetch('api/delete', {
            method: 'POST',
            headers: headers,
            body: body
          });
        })
          .catch((err) => {
            console.error(err);
            throw Error('Unable to delete item from IndexedDB');
          });
    }
    const child = document.getElementById('card-'+ id);
    container.removeChild(child);
  });
}



/* UI functions */

function updateUI(events) {
  events.forEach(event => {
    const item =
      `<li class="card" id="card-${event.id}">
         <div class="card-text">
           <h2>${event.title}</h2>
           <h4>${event.date}</h4>
           <h4>${event.city}</h4>
           <p>${event.note}</p>
           <button onclick=deleteEvent(${event.id})>Delete</button>
         </div>
       </li>`;
    container.insertAdjacentHTML('beforeend', item);
  });
}

function messageOffline() {
  // alert user that data may not be current
  const lastUpdated = getLastUpdated();
  if (lastUpdated) {
    offlineMessage.textContent += ' Last fetched server data: ' + lastUpdated;
  }
  offlineMessage.style.display = 'block';
}

function messageNoData() {
  // alert user that there is no data available
  noDataMessage.style.display = 'block';
}

function messageDataSaved() {
  // alert user that data has been saved for offline
  const lastUpdated = getLastUpdated();
  if (lastUpdated) {dataSavedMessage.textContent += ' on ' + lastUpdated;}
  dataSavedMessage.style.display = 'block';
}

function messageSaveError() {
  // alert user that data couldn't be saved offline
  saveErrorMessage.style.display = 'block';
}

/* Storage functions */

function getLastUpdated() {
  return localStorage.getItem('lastUpdated');
}

function setLastUpdated(date) {
  localStorage.setItem('lastUpdated', date);
}

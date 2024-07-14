// Function to show a notification message to the background script
export function sendNotification(title, message, url) {
  chrome.runtime.sendMessage(
    {
      type: "showNotification",
      title: title,
      message: message,
      url: url,
    },
    function (response) {
      if (chrome.runtime.lastError) {
        console.error("Message error:", chrome.runtime.lastError);
      } else {
        console.log("Message sent:", response);
      }
    }
  );
}

// Function to display saved moods
export function displayMoods(moods, container, editCallback, deleteCallback, activateCallback, activeMoodIndex, showEditDelete = true) {
  container.innerHTML = ""; // Clear existing list

  if (moods.length === 0) {
    const noMoodsMessage = document.createElement("div");
    noMoodsMessage.className = "no-moods-message";
    noMoodsMessage.innerHTML = `
      <p>No moods created yet.</p>
      <p>Click "Create New Mood" to get started!</p>
    `;
    container.appendChild(noMoodsMessage);
    return;
  }

  moods.forEach((mood, index) => {
    const moodItem = document.createElement("div");
    moodItem.className = "mood-item";
    if (index === activeMoodIndex) {
      moodItem.classList.add("active-mood");
    }
    moodItem.innerHTML = `
      <span>${mood.name}</span>
      <div class="action-buttons">
        ${
          index === activeMoodIndex
            ? "<span>Active Mood</span>"
            : showEditDelete
            ? `
            <button class="edit-button" data-index="${index}">Edit</button>
            <button class="delete-button" data-index="${index}">Delete</button>
          `
            : "<span>Not active</span>"
        }
      </div>
    `;

    moodItem.addEventListener("click", function () {
      if (activateCallback) activateCallback(index, moods);
    });

    if (showEditDelete && index !== activeMoodIndex) {
      moodItem.querySelector(".edit-button").addEventListener("click", (event) => {
        event.stopPropagation();
        if (editCallback) editCallback(index, moods);
      });

      moodItem.querySelector(".delete-button").addEventListener("click", (event) => {
        event.stopPropagation();
        if (deleteCallback) deleteCallback(index, moods);
      });
    }

    container.appendChild(moodItem);
  });
}

// Function to create a new mood with updated tab structure
export function createMood(name, tabs = [], music = "") {
  return {
    name,
    tabs,
    music,
  };
}

// Function to activate a selected mood
export function activateMood(index, moods, callback) {
  if (!moods || !moods[index]) {
    console.error("Moods array is undefined or index is out of bounds");
    return;
  }

  const mood = moods[index];
  const newTabIds = [];

  // Check if the mood is already active
  chrome.storage.local.get("activeMoodIndex", function (data) {
    if (data.activeMoodIndex === index) {
      sendNotification("Mood Already Active", `${mood.name} mood is already active!`, chrome.runtime.getURL("src/options/options.html"));
      return;
    }
    // Set the new active mood index
    chrome.storage.local.set({ activeMoodIndex: index }, function () {
      console.log(`Active mood index set to ${index}`);
    });

    // Get the current active tab
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTab = tabs[0];
      const activeTabId = activeTab.id;

      // Get all tabs in the current window
      chrome.tabs.query({ currentWindow: true }, function (tabs) {
        const tabIdsToClose = tabs.filter((tab) => tab.id !== activeTab.id).map((tab) => tab.id);

        // Close all tabs except the active one
        chrome.tabs.remove(tabIdsToClose, function () {
          // Open the mood tabs
          mood.tabs.forEach((tab, i) => {
            const tabUrl = typeof tab === "object" ? tab.url : tab;
            chrome.tabs.create({ url: tabUrl, active: i === 0 }, function (newTab) {
              newTabIds.push(newTab.id);
            });
          });

          // Play background music if specified
          if (mood.music) {
            chrome.tabs.create({ url: mood.music, pinned: true });
          }

          // Focus back on the original active tab
          chrome.tabs.update(activeTabId, { active: true });

          // Send a notification to the background script
          sendNotification("Mood Activated", `${mood.name} mood activated!`, chrome.runtime.getURL("src/options/options.html"));

          // Execute callback to refresh UI
          if (callback) callback();

          // Refresh the mood list in the popup
          chrome.runtime.sendMessage({ type: "refreshMoods" });
        });
      });
    });
  });
}

// Function to edit a selected mood
export function editMood(index, newMoodName, newTabUrls, newMusicUrl, callback) {
  chrome.storage.local.get("moods", function (data) {
    const moods = data.moods || [];

    if (!moods || !moods[index]) {
      console.error("Moods array is undefined or index is out of bounds");
      return;
    }

    const formattedTabUrls = newTabUrls.split(",").map((url) => {
      url = url.trim();
      if (!/^https?:\/\//i.test(url)) {
        url = "https://" + url;
      }
      return url;
    });

    let formattedMusicUrl = newMusicUrl;

    if (newMusicUrl && !/^https?:\/\//i.test(newMusicUrl)) {
      formattedMusicUrl = "https://" + newMusicUrl;
    }

    moods[index] = {
      name: newMoodName,
      tabs: formattedTabUrls,
      music: formattedMusicUrl,
    };

    chrome.storage.local.set({ moods: moods }, function () {
      // Send notification to the background script
      sendNotification("Mood Updated", `${newMoodName} mood updated!`, chrome.runtime.getURL("src/options/options.html"));
      if (callback) callback(); // Refresh the mood list
      // Send a message to refresh all instances
      chrome.runtime.sendMessage({ type: "refreshMoods" });
    });
  });
}

// Function to delete a selected mood
export function deleteMood(index, moods, callback) {
  if (!moods || !moods[index]) {
    console.error("Moods array is undefined or index is out of bounds");
    return;
  }

  if (confirm("Are you sure you want to delete this mood?")) {
    const deleteMood = moods.splice(index, 1)[0];

    chrome.storage.local.set({ moods: moods }, function () {
      sendNotification("Mood Deleted", `${deleteMood.name} mood deleted!`, chrome.runtime.getURL("src/options/options.html"));
      if (callback) callback(); // Refresh the mood list
      // Send a message to refresh all instances
      chrome.runtime.sendMessage({ type: "refreshMoods" });
    });
  }
}

// Function to deactivate the active mood
export function deactivateMood(callback) {
  chrome.storage.local.get("activeMoodIndex", function (data) {
    if (data.activeMoodIndex !== undefined) {
      chrome.storage.local.remove("activeMoodIndex", function () {
        console.log("Active mood deactivated!");

        // Close all tabs except the active one
        chrome.tabs.query({ currentWindow: true }, function (tabs) {
          const activeTab = tabs.find((tab) => tab.active);
          const tabIdsToClose = tabs.filter((tab) => tab.id !== activeTab.id).map((tab) => tab.id);
          chrome.tabs.remove(tabIdsToClose, function () {
            // Send a notification
            sendNotification("Mood Deactivated", "No mood is currently active!", chrome.runtime.getURL("src/options/options.html"));

            // Execute callback to refresh UI
            if (callback) callback();

            // Refresh the mood list in the popup
            chrome.runtime.sendMessage({ type: "refreshMoods" });
          });
        });
      });
    } else {
      console.log("No active mood to deactivate!");
      if (callback) callback(); // Execute callback even if no active mood
    }
  });
}

// Function to save a mood to local storage
export function saveMood(mood, callback) {
  chrome.storage.local.get({ moods: [] }, function (data) {
    const moods = data.moods || [];
    moods.push(mood);
    chrome.storage.local.set({ moods: moods }, function () {
      callback();
    });
  });
}

// Function to update the displayed list of tabs
export function updateTabsList(tabs, tabsList) {
  tabsList.innerHTML = "";
  tabs.forEach((tab, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
        <span>${tab}</span>
        <div class="action-buttons">
          <button class="edit-button" data-index="${index}">Edit</button>
          <button class="delete-button" data-index="${index}">Delete</button>
        </div>
      `;
    tabsList.appendChild(li);
  });
}

export function handleTabActions(event, tabs, tabsList) {
  const target = event.target;
  const index = target.getAttribute("data-index");
  if (target.classList.contains("edit-button")) {
    const newUrl = prompt("Edit URL:", tabs[index]);
    if (newUrl) {
      tabs[index] = newUrl;
      updateTabsList(tabs, tabsList);
    }
  } else if (target.classList.contains("delete-button")) {
    tabs.splice(index, 1);
    updateTabsList(tabs, tabsList);
  }
}

export function isValidUrl(url) {
  const pattern = new RegExp(
    "^(https?:\\/\\/)?" + // protocol
      "(([a-zA-Z\\d]([a-zA-Z\\d-]*[a-zA-Z\\d])*)\\.?)+\\.[a-zA-Z]{2,}" + // domain name with extension
      "(\\:\\d+)?(\\/[-a-zA-Z\\d%_.~+]*)*" + // port and path
      "(\\?[;&a-zA-Z\\d%_.~+=-]*)?" + // query string
      "(\\#[-a-zA-Z\\d_]*)?$",
    "i"
  ); // fragment locator
  return pattern.test(url);
}

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
export function displayMoods(
  moods,
  container,
  editCallback,
  deleteCallback,
  activateCallback,
  activeMoodIndex
) {
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
          index !== activeMoodIndex
            ? `
          <button class="edit-button" data-index="${index}">Edit</button>
          <button class="delete-button" data-index="${index}">Delete</button>
        `
            : "<span>Active Mood</span>"
        }
      </div>
    `;

    moodItem.addEventListener("click", function () {
      if (activateCallback) activateCallback(index, moods);
    });

    if (index !== activeMoodIndex) {
      moodItem
        .querySelector(".edit-button")
        .addEventListener("click", (event) => {
          event.stopPropagation();
          if (editCallback) editCallback(index, moods);
        });

      moodItem
        .querySelector(".delete-button")
        .addEventListener("click", (event) => {
          event.stopPropagation();
          if (deleteCallback) deleteCallback(index, moods);
        });
    }

    container.appendChild(moodItem);
  });
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
      sendNotification(
        "Mood Already Active",
        `${mood.name} mood is already active!`,
        chrome.runtime.getURL("options/options.html")
      );
      return;
    }
    // Set the new active mood index
    chrome.storage.local.set({ activeMoodIndex: index }, function () {
      console.log(`Active mood index set to ${index}`);
    });

    // Get the current active tab
    chrome.tabs.query(
      { active: true, currentWindow: true },
      function (tabs) {
        const activeTab = tabs[0];
        const activeTabId = activeTab.id;

        // Get all tabs in the current window
        chrome.tabs.query({ currentWindow: true }, function (tabs) {
          const tabIdsToClose = tabs
            .filter((tab) => tab.id !== activeTab.id)
            .map((tab) => tab.id);

          // Close all tabs except the active one
          chrome.tabs.remove(tabIdsToClose, function () {
            // Open the mood tabs
            mood.tabs.forEach((url, i) => {
              chrome.tabs.create({ url, active: i === 0 }, function (tab) {
                newTabIds.push(tab.id);
              });
            });

            // Play background music if specified
            if (mood.music) {
              chrome.tabs.create({ url: mood.music, pinned: true });
            }

            // Focus back on the original active tab
            chrome.tabs.update(activeTabId, { active: true });

            // Send a notification to the background script
            sendNotification(
              "Mood Activated",
              `${mood.name} mood activated!`,
              chrome.runtime.getURL("options/options.html")
            );

            // Execute callback to refresh UI
            if (callback) callback();

            // Refresh the mood list in the popup
            chrome.runtime.sendMessage({ type: "refreshMoods" });
          });
        });
      }
    );
  });
}

// Function to edit a selected mood
export function editMood(index, moods, callback) {
  if (!moods || !moods[index]) {
    console.error("Moods array is undefined or index is out of bounds");
    return;
  }

  const mood = moods[index];
  const newMoodName = prompt("Edit Mood Name:", mood.name);
  const newTabUrls = prompt(
    "Edit Tabs (comma separated URLs):",
    mood.tabs.join(", ")
  );
  const newMusicUrl = prompt("Edit Background Music URL:", mood.music);

  if (newMoodName && newTabUrls) {
    const formattedTabUrls = newTabUrls.split(",").map((url) => {
      url = url.trim();
      if (!/^https?:\/\//i.test(url)) {
        return "https://" + url;
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
      sendNotification(
        "Mood Updated",
        `${newMoodName} mood updated!`,
        chrome.runtime.getURL("options/options.html")
      );
      if (callback) callback(); // Refresh the mood list
      // Send a message to refresh all instances
      chrome.runtime.sendMessage({ type: "refreshMoods" });
    });
  }
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
      sendNotification(
        "Mood Deleted",
        `${deleteMood.name} mood deleted!`,
        chrome.runtime.getURL("options/options.html")
      );
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
          const tabIdsToClose = tabs
            .filter((tab) => tab.id !== activeTab.id)
            .map((tab) => tab.id);
          chrome.tabs.remove(tabIdsToClose, function () {
            // Send a notification
            sendNotification(
              "Mood Deactivated",
              "No mood is currently active!",
              chrome.runtime.getURL("options/options.html")
            );

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

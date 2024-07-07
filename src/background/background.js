// Function to show notifications
function showNotification(title, message, url) {
  chrome.notifications.create(
    "", // Notification ID (empty string generates a new ID)
    {
      type: "basic",
      iconUrl: "../../assets/icons/Icon128.png",
      title: title,
      message: message,
      priority: 2,
    },
    function (notificationId) {
      if (chrome.runtime.lastError) {
        console.error("Notification error:", chrome.runtime.lastError);
      } else {
        console.log("Notification shown:", notificationId);
        // Add click event listener for the notification
        chrome.notifications.onClicked.addListener(function (id) {
          if (id === notificationId) {
            // Open the extension popup URL
            chrome.tabs.create({ url: url });
          }
        });
      }
    }
  );
}

// Listen for messages from other scripts to show notifications
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received in background script:", request);
  if (request.type === "showNotification") {
    showNotification(request.title, request.message, request.url);
    sendResponse({ status: "Notification shown" });
  }
});

// Function to create dynamic context menu
function createContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.storage.local.get("moods", (data) => {
      const moods = data.moods || [];
      moods.forEach((mood, index) => {
        chrome.contextMenus.create({
          id: `addToMood-${index}`,
          title: `Add to ${mood.name}`,
          contexts: ["page", "selection", "link"],
        });
      });
    });
  });
}

// Listener for extension installation or update events
chrome.runtime.onInstalled.addListener(() => {
  console.log("VibeTabs Extension Installed and Updated");
  // Clear any existing alarms to avoid duplicates
  chrome.alarms.clearAll(() => {
    // Create a new alarm to trigger every day at 9 AM
    chrome.alarms.create("dailyPrompt", {
      when: Date.now(), // Start immediately
      periodInMinutes: 1440, // 24 hours
    });
  });

  createContextMenu(); // Create the context menu when the extension is installed
});

// Listener for storage changes to update context menu
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local" && changes.moods) {
    createContextMenu(); // Update the context menu when moods change
  }
});

// Listener for the daily alarm to prompt the user
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "dailyPrompt") {
    console.log("Daily prompt alarm triggered!");

    // Check if a mood is active before showing the notification
    chrome.storage.local.get("activeMood", (data) => {
      if (!data.activeMood) {
        // Show a notification to the user if no mood is active
        showNotification("What's your mood today?", "Click here to set your mood for the day!", chrome.runtime.getURL("src/options/options.html"));
      } else {
        console.log("A mood is currently active. No notification needed.");
      }
    });
  }
});

// Listener for context menu click events
chrome.contextMenus.onClicked.addListener((info, tab) => {
  const moodIndex = info.menuItemId.split("-")[1];
  chrome.storage.local.get("moods", (data) => {
    const moods = data.moods || [];
    if (moods[moodIndex]) {
      moods[moodIndex].tabs.push(tab.url);
      chrome.storage.local.set({ moods: moods }, () => {
        console.log(`Tab added to ${moods[moodIndex].name} mood!`);
        showNotification("Tab Added", `Tab added to ${moods[moodIndex].name} mood!`, tab.url);
        // Send a message to the options page to refresh the moods list
        chrome.runtime.sendMessage({ type: "refreshMoods" });
      });
    }
  });
});

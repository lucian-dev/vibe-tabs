// Function to show notifications
function showNotification(title, message, url) {
  chrome.notifications.create(
    "", // Notification ID (empty string generates a new ID)
    {
      type: "basic",
      iconUrl: "/images/icon128.png",
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

  // Create context menu item
  chrome.contextMenus.create({
    id: "addToMood",
    title: "Add to Mood",
    contexts: ["page", "selection", "link"],
  });
});

// Listener for the daily alarm to prompt the user
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "dailyPrompt") {
    console.log("Daily prompt alarm triggered!");

    // Check if a mood is active before showing the notification
    chrome.storage.local.get("activeMood", (data) => {
      if (!data.activeMood) {
        // Show a notification to the user if no mood is active
        showNotification("What's your mood today?", "Click here to set your mood for the day!", chrome.runtime.getURL("options/options.html"));
      } else {
        console.log("A mood is currently active. No notification needed.");
      }
    });
  }
});

// Listener for context menu click events
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "addToMood") {
    // Save the current tab information to local storage
    chrome.storage.local.set({ tabToAdd: tab.url }, function () {
      console.log("Tab URL saved to storage:", tab.url);
      // Open mood selection page
      chrome.tabs.create({
        url: chrome.runtime.getURL("selected/moodSelect.html"),
        active: true,
      });
    });
  }
});

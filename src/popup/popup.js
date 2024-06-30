import { displayMoods, activateMood, deactivateMood } from "../helpers/moodHelpers.js";

// Wait for the DOM to be fully loaded before executing the script
document.addEventListener("DOMContentLoaded", function () {
  const createNewMoodButton = document.getElementById("createNewMood");
  const openOptionsButton = document.getElementById("openOptions");
  const deactivateMoodButton = document.getElementById("deactivateMood");

  // Function to load and display moods
  function loadMoods() {
    // Retrieve saved moods from storage and active mood index from storage
    chrome.storage.local.get(["moods", "activeMoodIndex"], function (data) {
      const moods = data.moods || [];
      const activeMoodIndex = data.activeMoodIndex;

      // Conditionally show the deactivate button
      if (activeMoodIndex !== undefined) {
        deactivateMoodButton.style.display = "block";
      } else {
        deactivateMoodButton.style.display = "none";
      }

      // Display moods using the helper function
      displayMoods(
        moods,
        document.getElementById("moodList"),
        null, // No edit callback
        null, // No delete callback
        (index, moods) => activateMood(index, moods, loadMoods),
        activeMoodIndex,
        false
      );
    });
  }

  // Load moods when the popup is opened
  loadMoods();

  // Event listener to open the welcome page for creating a new mood
  createNewMoodButton.addEventListener("click", function () {
    chrome.tabs.create({
      url: chrome.runtime.getURL("src/welcome/welcome.html"),
    });
  });

  // Event listener to open the options page
  openOptionsButton.addEventListener("click", function () {
    chrome.runtime.openOptionsPage();
  });

  // Event listener to deactivate the active mood
  deactivateMoodButton.addEventListener("click", function () {
    deactivateMood(() => {
      loadMoods(); // Refresh UI after deactivation
    });
  });

  // Listen for messages to refresh the mood list
  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.type === "refreshMoods") {
      loadMoods();
    }
  });
});

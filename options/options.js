import {
  displayMoods,
  editMood,
  deleteMood,
  activateMood,
  deactivateMood,
} from "../helpers/moodHelpers.js";

document.addEventListener("DOMContentLoaded", function () {
  const createNewMoodButton = document.getElementById("createNewMood");
  const deactivateMoodButton = document.getElementById("deactivateMood");

  // Function to load and display moods
  function loadMoods() {
    // Retrieve saved moods and active mood index from storage
    chrome.storage.local.get(
      ["moods", "activeMoodIndex"],
      function (data) {
        const moods = data.moods || [];
        const activeMoodIndex = data.activeMoodIndex;

        // Conditionally show the deactivate button
        if (activeMoodIndex !== undefined) {
          deactivateMoodButton.style.display = "block";
        } else {
          deactivateMoodButton.style.display = "none";
        }

        // Display the moods using the helper function
        displayMoods(
          moods,
          document.getElementById("moodList"),
          (index, moods) => editMood(index, moods, loadMoods),
          (index, moods) => deleteMood(index, moods, loadMoods),
          (index, moods) => activateMood(index, moods, loadMoods),
          activeMoodIndex
        );
      }
    );
  }

  // Load moods when the options page is opened
  loadMoods();

  // Event listener to open the welcome page for creating a new mood
  createNewMoodButton.addEventListener("click", function () {
    window.location.href = chrome.runtime.getURL("welcome/welcome.html");
  });

  // Event listener to deactivate the active mood
  deactivateMoodButton.addEventListener("click", function () {
    deactivateMood(() => {
      loadMoods(); // Refresh UI after deactivation
    });
  });

  // Listen for messages to refresh the mood list
  chrome.runtime.onMessage.addListener(function (
    message,
    sender,
    sendResponse
  ) {
    if (message.type === "refreshMoods") {
      loadMoods();
    }
  });
});

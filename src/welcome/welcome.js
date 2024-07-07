import { saveMood, updateTabsList, handleTabActions } from "../helpers/moodHelpers.js";

document.addEventListener("DOMContentLoaded", function () {
  const createMoodButton = document.getElementById("createMood");
  const moodForm = document.getElementById("moodForm");
  const moodCreationForm = document.getElementById("moodCreationForm");
  const existingMoodsDiv = document.getElementById("existingMoods");
  const addTabButton = document.getElementById("addTabButton");
  const tabUrlInput = document.getElementById("tabUrl");
  const tabsList = document.getElementById("tabsList");
  let tabs = [];

  // Show the mood creation form when the "Create New Mood" button is clicked
  createMoodButton.addEventListener("click", function () {
    moodForm.style.display = "block";
    createMoodButton.style.display = "none";
  });

  // Check if there are existing moods and display the message
  chrome.storage.local.get("moods", function (data) {
    const moods = data.moods || [];
    if (moods.length > 0) {
      existingMoodsDiv.style.display = "block";
    }
  });

  // Handle the form submission
  moodCreationForm.addEventListener("submit", function (e) {
    e.preventDefault(); // Prevent the default form submission behavior

    // Get the values from the form fields
    const moodName = document.getElementById("moodName").value;
    const musicUrl = document.getElementById("musicUrl").value;

    // Ensure the music URL starts with http or https if provided
    let formattedMusicUrl = musicUrl;
    if (musicUrl && !/^https?:\/\//i.test(musicUrl)) {
      formattedMusicUrl = "https://" + musicUrl;
    }

    // Create a mood object with the form values
    const mood = {
      name: moodName,
      tabs: tabs,
      music: formattedMusicUrl,
    };

    saveMood(mood, () => {
      // Show a notification mood saved
      chrome.runtime.sendMessage({
        type: "showNotification",
        title: "Mood Saved",
        message: `${moodName} mood has been saved successfully!`,
        url: chrome.runtime.getURL("src/options/options.html"),
      });
      // Reset the form fields
      moodCreationForm.reset();
      tabs = []; // Reset tabs list
      updateTabsList(tabs, tabsList); // Clear the displayed list
      // Redirect to the options page
      window.location.href = chrome.runtime.getURL("src/options/options.html");
    });
  });

  // Add tab URL to the list
  addTabButton.addEventListener("click", function () {
    const url = tabUrlInput.value.trim();
    if (url) {
      if (!/^https?:\/\//i.test(url)) {
        tabs.push("https://" + url);
      } else {
        tabs.push(url);
      }
      updateTabsList(tabs, tabsList);
      tabUrlInput.value = "";
    }
  });

  // Handle tab actions (edit and delete)
  tabsList.addEventListener("click", function (event) {
    handleTabActions(event, tabs, tabsList);
  });
});

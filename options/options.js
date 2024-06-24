import { displayMoods, editMood, deleteMood, activateMood, deactivateMood } from "../helpers/moodHelpers.js";

document.addEventListener("DOMContentLoaded", function () {
  const createNewMoodButton = document.getElementById("createNewMood");
  const deactivateMoodButton = document.getElementById("deactivateMood");
  const editMoodModal = document.getElementById("editMoodModal");
  const closeModalButton = document.getElementById("closeModal");
  const editMoodForm = document.getElementById("editMoodForm");
  let currentEditIndex = null;

  // Function to load and display moods
  function loadMoods() {
    // Retrieve saved moods and active mood index from storage
    chrome.storage.local.get(["moods", "activeMoodIndex"], function (data) {
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
        openEditModal,
        (index, moods) => deleteMood(index, moods, loadMoods),
        (index, moods) => activateMood(index, moods, loadMoods),
        activeMoodIndex,
        true
      );
    });
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
  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.type === "refreshMoods") {
      loadMoods();
    }
  });

  // Function to open the edit modal
  function openEditModal(index, moods) {
    currentEditIndex = index;
    const mood = moods[index];

    console.log("Editing mood:", mood);

    const tabUrls = mood.tabs.map((tab) => {
      if (typeof tab === "object" && tab !== null) {
        console.log("Tab object:", tab);
        return tab.url;
      } else if (typeof tab === "string") {
        console.log("Tab is a string:", tab);
        return tab;
      } else {
        console.warn("Tab is neither an object nor a string:", tab);
        return "";
      }
    });
    console.log("Tabs before transformation:", tabUrls);

    const tabUrlsToDisplay = tabUrls.join(", ");
    console.log("Tab URLs to be displayed in form:", tabUrlsToDisplay);

    document.getElementById("editMoodName").value = mood.name;
    document.getElementById("editTabUrls").value = tabUrlsToDisplay;
    document.getElementById("editMusicUrl").value = mood.music || "";
    editMoodModal.style.display = "block";
  }

  // Event listener to close the edit modal
  closeModalButton.addEventListener("click", function () {
    editMoodModal.style.display = "none";
  });

  // Event listener to close the modal when clicking outside of it
  window.addEventListener("click", function (event) {
    if (event.target === editMoodModal) {
      editMoodModal.style.display = "none";
    }
  });

  // Event listener to handle the edit form submission
  editMoodForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const newMoodName = document.getElementById("editMoodName").value;
    const newTabUrls = document.getElementById("editTabUrls").value;
    const newMusicUrl = document.getElementById("editMusicUrl").value;
    console.log("New Tab URLs from form:", newTabUrls); // Add this line

    editMood(currentEditIndex, newMoodName, newTabUrls, newMusicUrl, loadMoods);
    editMoodModal.style.display = "none";
  });
});

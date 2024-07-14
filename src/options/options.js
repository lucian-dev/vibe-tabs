import { displayMoods, editMood, deleteMood, activateMood, deactivateMood, updateTabsList, handleTabActions, isValidUrl } from "../helpers/moodHelpers.js";

document.addEventListener("DOMContentLoaded", function () {
  const createNewMoodButton = document.getElementById("createNewMood");
  const deactivateMoodButton = document.getElementById("deactivateMood");
  const editMoodModal = document.getElementById("editMoodModal");
  const closeModalButton = document.getElementById("closeModal");
  const editMoodForm = document.getElementById("editMoodForm");
  const moodIdInput = document.getElementById("moodId");
  const editMoodNameInput = document.getElementById("editMoodName");
  const editMusicUrlInput = document.getElementById("editMusicUrl");
  const editTabUrlInput = document.getElementById("editTabUrl");
  const tabUrlError = document.getElementById("tabUrlError");
  const addTabButton = document.getElementById("addTabButton");
  const editTabsList = document.getElementById("editTabsList");
  let tabs = [];
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
    window.location.href = chrome.runtime.getURL("src/welcome/welcome.html");
  });

  // Event listener to deactivate the active mood
  deactivateMoodButton.addEventListener("click", function () {
    deactivateMood(() => {
      loadMoods(); // Refresh UI after deactivation
    });
  });

  // Listen for messages to refresh the mood list
  chrome.runtime.onMessage.addListener(function (message) {
    if (message.type === "refreshMoods") {
      loadMoods();
    }
  });

  // Function to open the edit modal
  function openEditModal(index, moods = []) {
    currentEditIndex = index;
    const mood = index !== null ? moods[index] : { name: "", tabs: [], music: "" };

    moodIdInput.value = index !== null ? mood.id : "";
    editMoodNameInput.value = mood.name;
    editMusicUrlInput.value = mood.music || "";
    tabs = mood.tabs || [];
    updateTabsList(tabs, editTabsList);
    editMoodModal.style.display = "block";
  }

  // Event listener to close the edit modal
  closeModalButton.addEventListener("click", function () {
    editMoodModal.style.display = "none";
    editTabUrlInput.classList.remove("error");
    tabUrlError.style.display = "none";
  });

  // Event listener to close the modal when clicking outside of it
  window.addEventListener("click", function (event) {
    if (event.target === editMoodModal) {
      editMoodModal.style.display = "none";
      editTabUrlInput.classList.remove("error");
      tabUrlError.style.display = "none";
    }
  });

  // Event listener to handle the edit form submission
  editMoodForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const moodId = moodIdInput.value;
    const moodName = editMoodNameInput.value;
    const musicUrl = editMusicUrlInput.value;
    let formattedMusicUrl = musicUrl;
    if (musicUrl && !/^https?:\/\//i.test(musicUrl)) {
      formattedMusicUrl = "https://" + musicUrl;
    }

    const mood = {
      id: moodId || new Date().getTime().toString(),
      name: moodName,
      tabs: tabs,
      music: formattedMusicUrl,
    };

    if (currentEditIndex !== null) {
      editMood(currentEditIndex, mood.name, mood.tabs.join(","), mood.music, () => {
        loadMoods();
        editMoodModal.style.display = "none"; // Close the modal
      });
    } else {
      chrome.storage.local.get({ moods: [] }, function (data) {
        let moods = data.moods || [];
        moods.push(mood);
        chrome.storage.local.set({ moods: moods }, function () {
          chrome.runtime.sendMessage({
            type: "showNotification",
            title: "Mood Saved",
            message: `${moodName} mood has been saved successfully!`,
            url: chrome.runtime.getURL("src/options/options.html"),
          });
          editMoodModal.style.display = "none";
          loadMoods();
        });
      });
    }
  });

  // Add tab URL to the list
  addTabButton.addEventListener("click", function () {
    const url = editTabUrlInput.value.trim();
    if (!url || !isValidUrl(url)) {
      editTabUrlInput.classList.add("error");
      tabUrlError.style.display = "block";
      editTabUrlInput.focus();
    } else {
      editTabUrlInput.classList.remove("error");
      tabUrlError.style.display = "none";
      if (!/^https?:\/\//i.test(url)) {
        tabs.push("https://" + url);
      } else {
        tabs.push(url);
      }
      updateTabsList(tabs, editTabsList);
      editTabUrlInput.value = "";
    }
  });

  // Real-time validation feedback
  editTabUrlInput.addEventListener("input", () => {
    if (tabUrlError.style.display === "block") {
      editTabUrlInput.classList.remove("error");
      tabUrlError.style.display = "none";
    }
  });

  // Handle tab actions (edit and delete)
  editTabsList.addEventListener("click", function (event) {
    handleTabActions(event, tabs, editTabsList);
  });
});

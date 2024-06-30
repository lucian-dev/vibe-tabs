document.addEventListener("DOMContentLoaded", function () {
  const createMoodButton = document.getElementById("createMood");
  const moodForm = document.getElementById("moodForm");
  const moodCreationForm = document.getElementById("moodCreationForm");
  const existingMoodsDiv = document.getElementById("existingMoods");

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
    let tabUrls = document
      .getElementById("tabUrls")
      .value.split(",")
      .map((url) => url.trim());
    const musicUrl = document.getElementById("musicUrl").value;

    // Ensure each tab URL starts with http or https
    tabUrls = tabUrls.map((url) => {
      if (!/^https?:\/\//i.test(url)) {
        return "https://" + url;
      }
      return url;
    });

    // Ensure the music URL starts with http or https if provided
    let formattedMusicUrl = musicUrl;
    if (musicUrl && !/^https?:\/\//i.test(musicUrl)) {
      formattedMusicUrl = "https://" + musicUrl;
    }

    // Create a mood object with the form values
    const mood = {
      name: moodName,
      tabs: tabUrls,
      music: formattedMusicUrl,
    };

    // Save the new mood to local storage
    chrome.storage.local.get({ moods: [] }, function (data) {
      const moods = data.moods || [];
      moods.push(mood); // Add the new mood to the list

      // Save the updated list of moods back to Chrome's local storage
      chrome.storage.local.set({ moods: moods }, function () {
        // Show a notification mood saved
        chrome.runtime.sendMessage({
          type: "showNotification",
          title: "Mood Saved",
          message: `${moodName} mood has been saved successfully!`,
          url: chrome.runtime.getURL("src/options/options.html"),
        });
        // Reset the form fields
        moodCreationForm.reset();
        // Redirect to the options page
        window.location.href = chrome.runtime.getURL("src/options/options.html");
      });
    });
  });
});

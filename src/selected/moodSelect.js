document.addEventListener("DOMContentLoaded", () => {
  const moodList = document.getElementById("moodList");
  const noMoodsMessage = document.getElementById("noMoodsMessage");

  // Retrieve saved moods from storage and display them
  chrome.storage.local.get({ moods: [] }, function (data) {
    const moods = data.moods || [];

    if (moods.length === 0) {
      noMoodsMessage.style.display = "block";
    } else {
      noMoodsMessage.style.display = "none";
      displayMoods(moods);
    }
  });

  function displayMoods(moods) {
    console.log("Displaying moods:", moods);
    moods.forEach((mood, index) => {
      const moodItem = document.createElement("div");
      moodItem.className = "mood-item";
      moodItem.innerHTML = `
        <span>${mood.name}</span>
        <button class="add-to-mood-button edit-button" data-index="${index}">Add to this Mood</button>
      `;

      moodItem.querySelector(".add-to-mood-button").addEventListener("click", function () {
        console.log("Add to Mood button clicked, index:", index);
        addToMood(index);
      });

      moodList.appendChild(moodItem);
    });
  }

  function addToMood(index) {
    console.log("addToMood function called with index:", index);
    chrome.storage.local.get(["moods", "tabToAdd"], function (data) {
      console.log("Data retrieved in addToMood:", data);
      const moods = data.moods || [];
      const mood = moods[index];
      const tabToAdd = data.tabToAdd;

      if (tabToAdd && typeof tabToAdd === "string") {
        console.log("Adding tab to mood:", tabToAdd);
        mood.tabs.push(tabToAdd);
        chrome.storage.local.set({ moods: moods }, function () {
          console.log(`Tab added to ${mood.name} mood!`);
          showAlertAndRedirect(`Tab added to "${mood.name}" mood!`);
        });
      } else {
        console.error("No tab to add found.");
      }
    });
  }

  function showAlertAndRedirect(message) {
    const alertContainer = document.querySelector(".container");
    const alertBox = document.createElement("div");
    alertBox.className = "alert-box";
    alertBox.innerHTML = `<p>${message}</p>`;

    const okButton = document.createElement("button");
    okButton.innerText = "OK";
    okButton.className = "primary-button";
    okButton.addEventListener("click", function () {
      alertBox.remove();
      window.location.href = chrome.runtime.getURL("src/options/options.html");
    });

    alertBox.appendChild(okButton);
    alertContainer.appendChild(alertBox);
  }
});

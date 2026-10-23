document.addEventListener("DOMContentLoaded", function () {

```
// Find all event registration buttons
const registerButtons = document.querySelectorAll(".register-button");

// Add a click action to each button
registerButtons.forEach(function (button) {

    button.addEventListener("click", function () {

        // Find the event card
        const eventCard = button.closest(".event-card");

        // Check whether the event card exists
        if (!eventCard) {
            alert("Sorry, the event could not be found.");
            return;
        }

        // Get the event name
        const eventHeading = eventCard.querySelector("h3");

        if (!eventHeading) {
            alert("The event name could not be found.");
            return;
        }

        const eventName = eventHeading.textContent.trim();

        // Open the registration page with the event name
        window.location.href =
            "/register.html?event=" + encodeURIComponent(eventName);

    });

});
```

});

document.addEventListener('DOMContentLoaded', () => {
    //... (sorting and filtering code - same as before)...

    // Fetch and populate data
    fetch('http://localhost:3000/api/comments')
      .then(response => response.json())
      .then(comments => {
            const tbody = commentTable.querySelector('tbody');
            if (Array.isArray(comments)) { // Check if comments is an array
                comments.forEach(comment => {
                    const row = tbody.insertRow();
                    row.insertCell().textContent = comment.name;
                    row.insertCell().textContent = comment.email;
                    row.insertCell().textContent = comment.website;
                    row.insertCell().textContent = comment.message;
                    row.insertCell().textContent = new Date(comment.date).toLocaleString();
                });
            } else {
                console.error("Error: Comments data is not an array:", comments);
                // Optionally display an error message to the user in the UI
            }
        })
      .catch(error => {
            console.error("Error fetching comments:", error);
            // Optionally display an error message to the user in the UI
        });

    fetch('http://localhost:3000/api/contact')
      .then(response => response.json())
      .then(messages => {
            const tbody = contactTable.querySelector('tbody');
            if (Array.isArray(messages)) { // Check if messages is an array
                messages.forEach(message => {
                    const row = tbody.insertRow();
                    row.insertCell().textContent = message.name;
                    row.insertCell().textContent = message.email;
                    row.insertCell().textContent = message.subject;
                    row.insertCell().textContent = message.message;
                    row.insertCell().textContent = new Date(message.date).toLocaleString();
                });
            } else {
                console.error("Error: Contact messages data is not an array:", messages);
                // Optionally display an error message to the user in the UI
            }
        })
      .catch(error => {
            console.error("Error fetching contact messages:", error);
            // Optionally display an error message to the user in the UI
        });
});
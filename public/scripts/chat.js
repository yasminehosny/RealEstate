const sender = document.getElementById("senderId").value;
const receiver = document.getElementById("receiverId").value;
const property = document.getElementById("propertyId").value;
const chatBox = document.getElementById("messages");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");

function appendMessage(msg, isMine) {
  const msgElement = document.createElement("div");
  msgElement.className = isMine ? "sent" : "received";
  msgElement.innerHTML = `<p>${msg.message}</p><small>${new Date(msg.timestamp).toLocaleString()}</small>`;
  chatBox.appendChild(msgElement);
  
}

function loadMessages() {
  fetch(`/api/messages/${property}/${receiver}`)
    .then(res => res.json())
    .then(data => {
      chatBox.innerHTML = "";
      data.forEach(msg => {
        const isMine = msg.sender.toString() === sender;
        appendMessage(msg, isMine);
      });
    });
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = messageInput.value.trim();
  if (!message) return;

  const res = await fetch("/api/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sender, receiver, property, message })
  });

  const msg = await res.json();
  if (msg.error) return alert(msg.error);

  appendMessage(msg, true);
  messageInput.value = "";
});

loadMessages();
setInterval(loadMessages, 1000);
const systemPrompt = "Giới thiệu và xin chào: Xin chào tôi là chatbot AI được triển khai bởi NLDK. Bạn cần tôi hỗ trợ gì về tài liệu học tập, hay cần liên hệ với NLDK hoặc điều gì khác. Tôi là AI chia sẻ tài liệu ôn thi cho sinh viên HUIT";
let isProcessing = false;
let conversationHistory = [
   { role: "user", parts: [{ text: systemPrompt }] }
];

function escapeHTML(str) {
   return str.replace(/[&<>"']/g, function (m) {
      return {
         '&': '&amp;',
         '<': '&lt;',
         '>': '&gt;',
         '"': '&quot;',
         "'": '&#39;'
      }[m];
   });
}

async function sendMessage() {
   if (isProcessing) return;
   isProcessing = true;
   const input = document.getElementById("user-input");
   const sendBtn = document.getElementById("send-btn");
   const message = input.value.trim();
   if (!message) return;

   sendBtn.disabled = true;

   displayMessage(message, "user");
   input.value = "";

   const botMessageElement = displayMessage("Bot đang trả lời...", "ai", true);

   const userMessageLower = message.toLowerCase();
   const localAnswer = await searchLocalData(userMessageLower);

   let promptText = "";

   if (localAnswer) {
      promptText =
         `Người dùng hỏi: "${message}".\n` +
         `Dưới đây là nội dung :\n"${localAnswer.answer}" gửi link và hãy chỉnh câu trả lời sinh động   `;
   } else {
      promptText = message;
   }

   conversationHistory.push({ role: "user", parts: [{ text: promptText }] });
   const reply = await sendMessageToGemini(conversationHistory);
   conversationHistory.push({ role: "model", parts: [{ text: reply }] });
   replaceMessage(botMessageElement, reply);

   sendBtn.disabled = false;
   isProcessing = false;
}

function displayMessage(msg, sender, isTemporary = false) {
   const chatBox = document.getElementById("chat-box");

   let escaped = escapeHTML(msg);
   escaped = escaped.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
   escaped = escaped.replace(/\s\*\s/g, "<br>");

   const div = document.createElement("p");
   div.className = `message ${sender}`;
   div.innerHTML = escaped;

   if (isTemporary) {
      div.classList.add("temporary");
   }

   chatBox.appendChild(div);
   chatBox.scrollTop = chatBox.scrollHeight;
   return div;
}

function typeHTMLByWord(container, html, speed = 100) {
   const tempDiv = document.createElement("div");
   tempDiv.innerHTML = html;

   const nodes = Array.from(tempDiv.childNodes);
   let currentNodeIndex = 0;

   function typeNextNode() {
      if (currentNodeIndex >= nodes.length) return;
      const node = nodes[currentNodeIndex++];
      typeNode(node, container, typeNextNode);
   }

   function typeNode(node, parent, callback) {
      if (node.nodeType === Node.TEXT_NODE) {
         const words = node.textContent.split(/(\s+)/);
         let i = 0;

         const span = document.createElement("span");
         parent.appendChild(span);

         function typeWord() {
            if (i < words.length) {
               span.textContent += words[i++];
               document.getElementById("chat-box").scrollTop = document.getElementById("chat-box").scrollHeight;
               setTimeout(typeWord, speed);
            } else {
               callback();
            }
         }

         typeWord();
      } else if (node.nodeType === Node.ELEMENT_NODE) {
         const clone = node.cloneNode(false);
         parent.appendChild(clone);

         const childNodes = Array.from(node.childNodes);
         let childIndex = 0;

         function typeNextChild() {
            if (childIndex < childNodes.length) {
               typeNode(childNodes[childIndex++], clone, typeNextChild);
            } else {
               callback();
            }
         }

         typeNextChild();
      } else {
         callback();
      }
   }

   typeNextNode();
}

function replaceMessage(oldMessageElement, newMessage) {
   const chatBox = document.getElementById("chat-box");

   let escaped = escapeHTML(newMessage);
   escaped = escaped.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
   escaped = escaped.replace(/\s\*\s/g, "<br>");
   escaped = escaped.replace(/^(\d+\.\s)/gm, "<br>$1");

   const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
   escaped = escaped.replace(urlPattern, function (url) {
      return `<a href="${url}" target="_blank" class="link-document">${url}</a>`;
   });

   const newMessageElement = document.createElement("p");
   newMessageElement.className = "message ai";
   newMessageElement.innerHTML = " ";
   chatBox.replaceChild(newMessageElement, oldMessageElement);
   chatBox.scrollTop = chatBox.scrollHeight;

   typeHTMLByWord(newMessageElement, escaped, 5);
}

async function sendMessageToGemini(conversation) {
   try {
      const response = await fetch("/chat", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ conversation })
      });

      const data = await response.json();
      return data.reply || "Không có phản hồi.";
   } catch (err) {
      console.error("Lỗi gọi API từ server:", err);
      return "Lỗi khi gửi yêu cầu đến server.";
   }
}

async function searchLocalData(question) {
  try {
    const res = await fetch("/localdata");
    const data = await res.json(); // data là mảng object JSON

    for (const item of data) {
      const keywords = item.keyword;
      for (const kw of keywords) {
        if (question.toLowerCase().includes(kw.toLowerCase())) {
          return { answer: item.answer };
        }
      }
    }
    return null;
  } catch (err) {
    console.error("Lỗi khi tải dữ liệu từ server:", err);
    return null;
  }
}


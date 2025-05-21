const apiKey = "AIzaSyDGn0h1_hQl1tegCY9nzyn4FTxuip7hc4s";
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
         `Dưới đây là nội dung :\n"${localAnswer.answer}" và hãy chỉnh câu trả lời sinh động. không gửi nhiều 1 lần đường dẫn https  `;
   } else {
      promptText = message;
   }

   conversationHistory.push({ role: "user", parts: [{ text: promptText }] });
   const reply = await sendMessageToGemini(conversationHistory);
   conversationHistory.push({ role: "model", parts: [{ text: reply }] });
   replaceMessage(botMessageElement, reply);

  sendBtn.disabled = false; // Mở lại nút gửi
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
         const words = node.textContent.split(/(\s+)/); // giữ cả dấu cách
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
   escaped = escaped.replace(urlPattern, function(url) {
      return `<a href="${url}" target="_blank" class="link-document">${url}</a>`;
   });

   const newMessageElement = document.createElement("p");
   newMessageElement.className = "message ai";
   newMessageElement.innerHTML = " ";
  // newMessageElement.innerHTML = escaped;

   chatBox.replaceChild(newMessageElement, oldMessageElement);
   chatBox.scrollTop = chatBox.scrollHeight;

   typeHTMLByWord(newMessageElement, escaped, 5);
}
async function sendMessageToGemini(conversation) {
   try {
      const response = await fetch(
         `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
         {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: conversation })
         }
      );

      const data = await response.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return reply || "Không có phản hồi.";
   } catch (err) {
      console.error("Lỗi gọi API:", err);
      return "Đã xảy ra lỗi khi gọi Gemini API.";
   }
}

async function searchLocalData(question) {
   try {
      const res = await fetch("https://raw.githubusercontent.com/nguyenledangkhoaa/ai/main/data.json");
      const text = await res.text();
      const lines = text.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
         const data = JSON.parse(line);

         const keywords = data.keyword;
         for (const kw of keywords) {
            if (question.toLowerCase().includes(kw.toLowerCase())) {
               return { answer: data.answer};
            }
         }
      }
      return null;
   } catch (err) {
      console.error("Lỗi khi tải dữ liệu:", err);
      return null;
   }
}

document.addEventListener('keydown', function (e) {
   const input = document.getElementById("user-input");
   if (e.key === "Enter" && !input.disabled) {
      sendMessage();
   }
   if (
      e.key === 'F12' || 
      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
      (e.ctrlKey && e.key === 'U')
   ) {
      e.preventDefault();
      alert("Tính năng này đã bị vô hiệu hóa.");
   }
});

/**
 * WAQTORO — Contact Page JavaScript
 */

/* ---- TOPIC TABS ---- */
function setTopic(btn) {
  document.querySelectorAll('.topic-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  const topic = btn.dataset.topic;
  const orderField = document.getElementById('order-field');
  if (orderField) orderField.style.display = topic === 'order' ? 'flex' : 'none';

  // Pre-fill subject with context
  const subjectEl = document.getElementById('ct-subject');
  const subjects = {
    general: '',
    order:   'Order Query — #',
    returns: 'Return Request — ',
    product: 'Product Question — '
  };
  if (subjectEl && subjects[topic]) subjectEl.value = subjects[topic];
}

/* ---- FORM SUBMIT ---- */
async function submitContact(e) {
  e.preventDefault();
  const btn = document.getElementById('contact-submit-btn');
  
  const name    = document.getElementById('ct-name')?.value || 'Guest';
  const email   = document.getElementById('ct-email')?.value || 'No Email';
  const phone   = document.getElementById('ct-phone')?.value || 'No Phone';
  const subject = document.getElementById('ct-subject')?.value || 'General Inquiry';
  const message = document.getElementById('ct-message')?.value || '';
  
  const activeTab = document.querySelector('.topic-tab.active')?.textContent || 'General';
  const orderNum  = document.getElementById('ct-order')?.value || 'N/A';

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Sending…';
  }

  // Format message for EmailJS
  const emailText = `
NEW CONTACT FORM MESSAGE
Topic: ${activeTab}
${orderNum !== 'N/A' ? `Order #: ${orderNum}\n` : ''}

CUSTOMER
Name: ${name}
Email: ${email}
Phone: ${phone}

MESSAGE
Subject: ${subject}

${message}
  `.trim();

  // 1. Send Email via EmailJS
  try {
    emailjs.init("V4AbfNxoQW2_Zwp-R");
    emailjs.send(
      "service_amn9ohp", 
      "template_sfia319", 
      {
        to_email: "waqtoro@gmail.com",
        order_id: `Contact - ${name}`,
        message: emailText,
        from_name: "Waqtoro Website"
      }
    ).then(() => {
      document.getElementById('contact-form').style.display = 'none';
      const successEl = document.getElementById('contact-success');
      if (successEl) {
        successEl.style.display = 'block';
        document.getElementById('success-email').textContent = email;
      }
      showToast('Message sent! We\'ll be in touch soon.', 'check');
    }).catch((err) => {
      console.error("EmailJS Error:", err);
      showToast('Failed to send message. Please try again.', 'alert-triangle');
      if (btn) { btn.disabled = false; btn.innerHTML = 'Send Message →'; }
    });
  } catch (err) {
    console.error("EmailJS Init Error:", err);
  }
}

function resetContactForm() {
  document.getElementById('contact-form').reset();
  document.getElementById('contact-form').style.display = 'flex';
  document.getElementById('contact-success').style.display = 'none';
  const btn = document.getElementById('contact-submit-btn');
  if (btn) { btn.disabled = false; btn.innerHTML = 'Send Message →'; }
}

/* ---- FAQ ACCORDION ---- */
function toggleFaq(btn) {
  const answer = btn.nextElementSibling;
  const isOpen = btn.classList.contains('open');

  // Close all others
  document.querySelectorAll('.faq-q.open').forEach(q => {
    q.classList.remove('open');
    q.nextElementSibling.style.maxHeight = '0';
  });

  if (!isOpen) {
    btn.classList.add('open');
    answer.style.maxHeight = answer.scrollHeight + 'px';
  }
}

/* ---- INIT ---- */
document.addEventListener('DOMContentLoaded', () => {
  // Open first FAQ by default
  const firstFaq = document.querySelector('.faq-q');
  if (firstFaq) toggleFaq(firstFaq);
});

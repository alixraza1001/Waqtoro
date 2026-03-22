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

function applyTopicFromURL() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('topic');
  if (!requested) return;
  const btn = document.querySelector(`.topic-tab[data-topic="${requested}"]`);
  if (btn) setTopic(btn);
}

/* ---- FORM SUBMIT ---- */
async function submitContact(e) {
  e.preventDefault();
  const btn = document.getElementById('contact-submit-btn');

  const fnameEl = document.getElementById('ct-fname');
  const lnameEl = document.getElementById('ct-lname');
  const emailEl = document.getElementById('ct-email');
  const subjectEl = document.getElementById('ct-subject');
  const messageEl = document.getElementById('ct-message');
  const consentEl = document.getElementById('ct-consent');
  const orderEl = document.getElementById('ct-order');

  clearContactErrors();

  let firstInvalid = null;
  const required = [
    { el: fnameEl, message: 'First name is required.' },
    { el: lnameEl, message: 'Last name is required.' },
    { el: emailEl, message: 'Email address is required.' },
    { el: subjectEl, message: 'Subject is required.' },
    { el: messageEl, message: 'Message is required.' }
  ];

  required.forEach(({ el, message }) => {
    if (!el) return;
    if (!el.value.trim()) {
      setContactError(el, message);
      if (!firstInvalid) firstInvalid = el;
    }
  });

  if (emailEl?.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value.trim())) {
    setContactError(emailEl, 'Enter a valid email address.');
    if (!firstInvalid) firstInvalid = emailEl;
  }

  if (messageEl?.value.trim() && messageEl.value.trim().length < 10) {
    setContactError(messageEl, 'Please provide a bit more detail (at least 10 characters).');
    if (!firstInvalid) firstInvalid = messageEl;
  }

  if (consentEl && !consentEl.checked) {
    setContactError(consentEl, 'Please agree so we can respond to your query.');
    if (!firstInvalid) firstInvalid = consentEl;
  }

  if (firstInvalid) {
    firstInvalid.focus();
    showToast('Please correct the highlighted fields.', 'info');
    return;
  }

  const name = `${fnameEl?.value.trim() || ''} ${lnameEl?.value.trim() || ''}`.trim();
  const email = emailEl?.value.trim() || '';
  const subject = subjectEl?.value.trim() || 'General Inquiry';
  const message = messageEl?.value.trim() || '';
  
  const activeTab = document.querySelector('.topic-tab.active')?.textContent || 'General';
  const orderNum  = orderEl?.value?.trim() || 'N/A';

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
    await emailjs.send(
      "service_amn9ohp", 
      "template_sfia319", 
      {
        to_email: "waqtoro@gmail.com",
        order_id: `Contact - ${name}`,
        message: emailText,
        from_name: "Waqtoro Website"
      }
    );

    document.getElementById('contact-form').style.display = 'none';
    const successEl = document.getElementById('contact-success');
    if (successEl) {
      successEl.style.display = 'block';
      document.getElementById('success-email').textContent = email;
    }
    showToast('Message sent! We\'ll be in touch soon.', 'check');
  } catch (err) {
    console.error("Contact form send failed:", err);
    showToast('Failed to send message. Please try again.', 'info');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = 'Send Message →';
    }
  }
}

function resetContactForm() {
  document.getElementById('contact-form').reset();
  document.getElementById('contact-form').style.display = 'flex';
  document.getElementById('contact-success').style.display = 'none';
  const btn = document.getElementById('contact-submit-btn');
  if (btn) { btn.disabled = false; btn.innerHTML = 'Send Message →'; }
}

function setContactError(inputEl, message) {
  if (!inputEl) return;
  const formGroup = inputEl.closest('.form-group') || inputEl.closest('.form-check');
  if (!formGroup) return;
  formGroup.classList.add('has-error');

  let err = formGroup.querySelector('.field-error');
  if (!err) {
    err = document.createElement('p');
    err.className = 'field-error';
    formGroup.appendChild(err);
  }
  err.textContent = message;
}

function clearContactErrors() {
  document.querySelectorAll('.contact-form-col .has-error').forEach((group) => {
    group.classList.remove('has-error');
  });
  document.querySelectorAll('.contact-form-col .field-error').forEach((err) => {
    err.textContent = '';
  });
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
  applyTopicFromURL();

  ['ct-fname', 'ct-lname', 'ct-email', 'ct-order', 'ct-subject', 'ct-message', 'ct-consent'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', clearContactErrors);
    el.addEventListener('change', clearContactErrors);
  });
});

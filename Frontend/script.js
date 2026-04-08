// Global scripts for Saham Platform
document.addEventListener("DOMContentLoaded", () => {
  // Navbar scroll effect
  const nav = document.querySelector(".glass-nav");
  if (nav) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 50) {
        nav.style.background = "rgba(15, 23, 42, 0.95)";
        nav.style.boxShadow = "0 4px 30px rgba(0, 0, 0, 0.5)";
      } else {
        nav.style.background = "rgba(15, 23, 42, 0.8)";
        nav.style.boxShadow = "none";
      }
    });
  }

  // Initialize tooltips if any
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  if (typeof bootstrap !== "undefined") {
    tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });
  }
});

/**
 * Validate email format using regex
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Common alert generator
 * @param {string} message
 * @param {string} type ('success', 'danger', 'info', 'warning')
 */
function showToast(message, type = "info") {
  // create simple toast logic if needed globally
  console.log(`[${type.toUpperCase()}] ${message}`);
}

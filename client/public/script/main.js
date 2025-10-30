// ===== ClientPulse v2 Frontend Logic =====

// Check if Firebase is ready
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const logoutBtn = document.getElementById("logoutBtn");
  const userStatus = document.getElementById("userStatus");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = e.target.email.value;
      const password = e.target.password.value;

      try {
        const { signInWithEmailAndPassword } = window.firebaseAuth;
        const userCredential = await signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        const token = await user.getIdToken();
        localStorage.setItem("token", token);

        userStatus.textContent = `Welcome, ${user.email}`;
        alert("Login successful!");
      } catch (error) {
        console.error(error);
        alert("Login failed. Check your credentials.");
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      const { signOut } = window.firebaseAuth;
      await signOut();
      localStorage.removeItem("token");
      userStatus.textContent = "Logged out";
    });
  }
});

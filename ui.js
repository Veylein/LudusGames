const themeBtn = document.getElementById("themeBtn");
const themeDropdown = document.querySelector(".theme-dropdown");
const themeOptions = document.querySelectorAll(".theme-menu button");

themeBtn.addEventListener("click", () => {
    themeDropdown.classList.toggle("open");
});

themeOptions.forEach(btn => {
    btn.addEventListener("click", () => {
        document.body.className = btn.dataset.theme;
        localStorage.setItem("theme", btn.dataset.theme);
    });
});

window.onload = () => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) document.body.className = savedTheme;
};

// Isolated darkmode logic
// Dark mode theme switch
function pageThemeSwitch(request) {
    switch (request) {
        case "enable":
            document.body.classList.add("darkmode");
            document.querySelector("link[rel~='icon']").href = "img/favicon-dark.svg";
            localStorage.setItem("darkmode", "active");
            break;

        case "disable":
            document.body.classList.remove("darkmode");
            document.querySelector("link[rel~='icon']").href = "img/favicon.svg";
            localStorage.setItem("darkmode", null);
    };
};

// Dark mode is auto enabled if the local storage variable is already set
if (localStorage.getItem('darkmode') === "active") pageThemeSwitch("enable");

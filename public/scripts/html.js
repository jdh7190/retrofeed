const modal = document.getElementById('myModal');
const modalText = document.getElementById("modalTxt");
const span = document.getElementsByClassName("close")[0];
const prof = document.getElementById('prof');
const tPost = document.getElementById('tPost');
const tipSection = document.getElementById('tipSection');
span.onclick = () => {
    modal.style.display = "none";
    tipSection.style.display = "none";
}
onclick = e => {
    if (e.target === modal) {
        modal.style.display = "none";
        tipSection.style.display = "none";
    }
}
const showModal = text => {
    modal.style.display = 'block';
    modalText.innerText = text;
}
const closeModal = () => {
    tipSection.style.display = 'none';
    modal.style.display = 'none';
}
const dots = setInterval(() => {
    const wait = modalText;
    if (loadingPost === true) {
        if (wait.innerText.length > loadingText.length + 2) { wait.innerText = loadingText } 
        else { wait.innerText += "." }
    }
}, 300);
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/serviceworker.js')
    .then(registration => {console.log('Registration successful, scope is:', registration.scope)})
    .catch(error => {console.log('Service worker registration failed, error:', error)});
}
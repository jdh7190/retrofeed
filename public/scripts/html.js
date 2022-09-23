const modal = document.getElementById('myModal');
const modalText = document.getElementById("modalTxt");
const span = document.getElementsByClassName("close")[0];
const prof = document.getElementById('prof');
const tPost = document.getElementById('tPost');
span.onclick = () => {
    modal.style.display = "none";
}
onclick = e => {
    if (e.target === modal) {
        modal.style.display = "none";
    }
}
addEventListener('DOMContentLoaded', () => {
    const parsedUrl = new URL(location);
    document.getElementById("post").value = parsedUrl.searchParams.get('text');
    checkPost();
});
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/serviceworker.js')
    .then(registration => {console.log('Registration successful, scope is:', registration.scope)})
    .catch(error => {console.log('Service worker registration failed, error:', error)});
}
'use strict';
const version = new URLSearchParams(window.location.search).get('version');
document.getElementById('version').textContent = version ? 'v' + version : '';

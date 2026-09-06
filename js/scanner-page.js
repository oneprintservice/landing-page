function generateRandomCode(){

const random =
'OPS-' +
new Date().getFullYear().toString().slice(-2) +
String(new Date().getMonth()+1).padStart(2,'0') +
String(new Date().getDate()).padStart(2,'0') +
'-' +
Math.floor(Math.random()*900+100);

document.getElementById('manualCode').value = random;

}

function generateQR(){

const code = document.getElementById('manualCode').value;
const customer = document.getElementById('customer').value;
const unit = document.getElementById('unit').value;

if(!code){
alert('Masukkan kode terlebih dahulu');
return;
}

const qrText = code;

QRCode.toCanvas(
document.getElementById('qrcode'),
qrText,
{
width:220,
margin:1
}
);

QRCode.toCanvas(
document.getElementById('printQR'),
qrText,
{
width:100,
margin:1
}
);

document.getElementById('previewCode').innerText = code;

document.getElementById('previewInfo').innerText =
(customer || '-') + ' | ' + (unit || '-');

document.getElementById('printCode').innerText =
'ID : ' + code;

document.getElementById('printCustomer').innerText =
'Nama : ' + (customer || '-');

document.getElementById('printUnit').innerText =
'Unit : ' + (unit || '-');

}

function printThermal(){

generateQR();

setTimeout(()=>{
window.print();
},300);

}

function startScanner(){

if(scannerRunning) return;


html5QrCode = new Html5Qrcode('reader');

scannerRunning = true;

document.getElementById('scanToggleBtn').innerText = 'Stop Scan';
document.getElementById('scanToggleBtn').classList.remove('bg-blue-600');
document.getElementById('scanToggleBtn').classList.add('bg-red-500');

html5QrCode.start(
{ facingMode:'environment' },
{
fps:10,
qrbox:{width:250,height:250}
},
(decodedText)=>{

document.getElementById('scanResult').innerText = decodedText;
document.getElementById('manualCode').value = decodedText;

if(navigator.vibrate){
navigator.vibrate(120);
}

},
()=>{}
);

}


let html5QrCode = null;
let scannerRunning = false;

function toggleScanner(){
if(scannerRunning){
stopScanner();
}else{
startScanner();
}
}

function stopScanner(){

if(html5QrCode){

html5QrCode.stop().then(()=>{

scannerRunning = false;

document.getElementById('scanToggleBtn').innerText =
'Start Scan';

document.getElementById('scanToggleBtn')
.classList.remove('bg-red-500');

document.getElementById('scanToggleBtn')
.classList.add('bg-blue-600');

});

}

}

function copyScanResult(){

const text =
document.getElementById('scanResult').innerText;

if(text && text !== 'Belum ada hasil'){
navigator.clipboard.writeText(text);
alert('ID berhasil disalin');
}

}

function fillManualCode(){

const text =
document.getElementById('scanResult').innerText;

if(text && text !== 'Belum ada hasil'){
document.getElementById('manualCode').value = text;
}

}


generateRandomCode();

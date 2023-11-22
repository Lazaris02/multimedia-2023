
//---Get the basic elements of the board
const board = document.querySelector('#board');
const tiles = document.querySelectorAll('.tile');
const sound_rows = document.querySelector('.sound-rows');
const play_button = document.querySelector('#play-button');
const context = new AudioContext();


// -- sound collections -- 
let kit_1 = [];

// -- variables for collections --



// -- event-listeners --
 sound_rows.addEventListener('click',(e)=>{
    if(e.target.classList.contains('tile')){
        e.target.classList.toggle('tile-on');
        playSound(0);
    }
 });


 play_button.addEventListener('click',(e)=>{
    // if play button is clicked change its color
    e.target.classList.toggle('func-button-on');
 });







 // -- functions --
function initialize_sounds(){
    // fetches + decoded + initialized all our sounds
    // might need to be an async func 
    // might need to sync the fetches
    fetch("../assets/audio/kick_1.wav")
        .then(audio=>audio.arrayBuffer())
        .then(buffer=>context.decodeAudioData(buffer))
        .then(decoded =>{
            kit_1.push(decoded);
            console.log(kit_1[0]);
        });
    fetch("../assets/audio/snare_1.wav")
        .then(audio=>audio.arrayBuffer())
        .then(buffer=>context.decodeAudioData(buffer))
        .then(decoded =>{
            kit_1.push(decoded);
            console.log(kit_1[1]);
        });

}

function playSound(kit_position){
    const sound = context.createBufferSource();
    sound.buffer = kit_1[kit_position];
    sound.connect(context.destination);
    sound.start(context.currentTime);
}



initialize_sounds();




 








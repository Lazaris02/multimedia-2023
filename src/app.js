
//---Get the basic elements of the board
const board = document.querySelector('#board');
const tiles = document.querySelectorAll('.tile');
const sound_rows = document.querySelector('.sound-rows');
const play_button = document.querySelector('#play-button');
const context = new AudioContext();
const relative_path ='../assets/audio/';

// creates a 8x16 array -->1 row for every sound + 16 tiles 
// for every sound. if I click on a tile it sets the respective
// board_tile position into a 1. If I unclick it goes back to 0
const board_tiles = Array(8).fill().map(()=> new Array(16).fill(0));
let play = false;
let play_interval;


// -- sound collections --

const fileNames =['kick_1.wav','snare_1.wav'];


let kit_1 = []; //will contain the sounds.

// -- variables for collections --



// -- event-listeners --
 sound_rows.addEventListener('click',(e)=>{
    if(e.target.classList.contains('tile')){
        e.target.classList.toggle('tile-on');
        const parent = e.target.parentElement;
        board_tiles[+parent.dataset.row][+e.target.dataset.tile] =+!board_tiles[+parent.dataset.row][+e.target.dataset.tile];
    }
 });


 play_button.addEventListener('click',(e)=>{
    // if play button is clicked change its color
    e.target.classList.toggle('func-button-on');
    play=!play;
    console.log(play,' play',typeof play);
    if(play){
        play_interval=setInterval(playBoard,1000);
    }
    else{
        console.log('hi from stopping interval!');
        clearInterval(play_interval);
    }
 });





 // -- functions --


 async function getSound(path){
    // uses the fetch api to fetch the sounds from the url we give it
    const response = await fetch(path);
    const buffer = await response.arrayBuffer();
    const decodedAudio = await context.decodeAudioData(buffer);
    return decodedAudio;
}


async function initialize_sounds(path_array){
    // preloads all the sounds we will need in the kits array
    for(let name of fileNames){
        console.log(`pushing ${relative_path}${name}`);
        const sound = await getSound(relative_path+name);
        kit_1.push(sound);
    }
    console.log('sounds ready');
}




function playSound(kit_position){
    const sound = context.createBufferSource();
    sound.buffer = kit_1[kit_position];
    sound.connect(context.destination);
    sound.start(context.currentTime);
}


function playBoard(){
    console.log('hi');
}





console.log(board_tiles[0].length);
initialize_sounds();






 








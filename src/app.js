
//---Get the basic elements of the board
const board = document.querySelector('#board');
const tiles = document.querySelectorAll('.tile');
const sound_rows = document.querySelector('.sound-rows');
const play_button = document.querySelector('#play-button');
const context = new AudioContext();
const relative_path = '../assets/audio/';




const max_tiles = 16;
const sound_num = 8;

const tempo  = 100; // our base tempo

const time_signature = 4; // beats per bar

// creates a 8x16 array -->1 row for every sound + 16 tiles 
// for every sound. if I click on a tile it sets the respective
// board_tile position into a 1. If I unclick it goes back to 0
const board_tiles = Array(sound_num).fill().map(() => new Array(max_tiles).fill(0));

// handles start-stop
let play = false;
let play_interval;


// -- sound collections --
const fileNames = ['kick_1.wav', 'snare_1.wav','kick_1.wav', 'snare_1.wav','kick_1.wav', 'snare_1.wav','kick_1.wav', 'snare_1.wav'];
const kit_1 = []; //will contain the sounds.

// it is an object with 16 keys - 1 for each time
// we add the sounds to be played in the respective key
// for example currSample[0] contains all the sounds to be played
// in the first column of the kit (maximum 8 sounds)
let currSample = {};


// -- event-listeners --
sound_rows.addEventListener('click', (e) => {
    // if a tile is clicked :
    // 1. it changes color 2. I toggle its status on the board matrix
    // 3. I need to add the respective sound + position in the sample
    // so that it can be played when we press play
    if (e.target.classList.contains('tile')) {
        e.target.classList.toggle('tile-on');
        const parent = e.target.parentElement;
        const sound_row = +parent.dataset.row;
        const time = +e.target.dataset.tile;
        board_tiles[sound_row][time] = +!board_tiles[sound_row][time];
        if (e.target.className == 'tile tile-on') {
            playSound(sound_row);
            updateCurrentSample(sound_row, time, true);
        }
        else {
            updateCurrentSample(sound_row, time, false);
        }

    }
});


play_button.addEventListener('click', (e) => {
    // if play button is clicked change its color
    e.target.classList.toggle('func-button-on');
    play = !play;
    console.log(play, ' play', typeof play);
    if (play) {
        playBoard();
        let time_between = (60/tempo)*time_signature*1000;
        play_interval = setInterval(playBoard,time_between+90);
    }
    else {
        console.log('hi from stopping interval!');
        clearInterval(play_interval);
    }
});





// -- functions --

function playBoard() {
    // for each step play the sound-strings in sync
    let delay = 0;
    const space = calculateSoundDelay();
    for (let step of Object.values(currSample)) {
        if (step.some(item => { return item != 0; })) {
            console.log('nonempty', step);
            playStep(step,delay);
        }
        delay += space;
    }

}




function updateCurrentSample(sound_row, time, add) {
    // adds the sound to the time it should be played at
    // with the other sounds it will be played
    if (add) { currSample[time][sound_row] = kit_1[sound_row]; }
    else { currSample[time][sound_row] = 0; }

    console.log(currSample);
    console.log(kit_1[0], kit_1[1], 'kit_1');
}


function playStep(step,delay) {
    // is passed an array containing samples to be played in sync
    const sounds = step.filter(s=> s!=0);
    for(let s of sounds){
        let bs = context.createBufferSource();
        bs.buffer = s;
        bs.connect(context.destination);
        bs.start(context.currentTime + delay);
    }
    
}


function playSound(kit_position) {
    // play the sound that corresponds to a specific row.
    const sound = context.createBufferSource();
    sound.buffer = kit_1[kit_position];
    sound.connect(context.destination);
    sound.start(context.currentTime);
}


function calculateSoundDelay(){
    //returns the time delay between 2 bars
    return (60/tempo) * (time_signature/max_tiles);
}


async function getSound(path) {
    // uses the fetch api to fetch the sounds from the url we give it
    const response = await fetch(path);
    const buffer = await response.arrayBuffer();
    const decodedAudio = await context.decodeAudioData(buffer);
    return decodedAudio;
}


async function initialize_sounds(path_array) {
    // preloads all the sounds we will need in the kits array
    for (let name of fileNames) {
        console.log(`pushing ${relative_path}${name}`);
        const sound = await getSound(relative_path + name);
        kit_1.push(sound);
    }
    console.log('sounds ready');
}






function initialize_curr_selection() {
    // initializes the 
    for (let i = 0; i < max_tiles; i++) {
        currSample[i] = Array(8).fill(0);
    }
    console.log(currSample);
}



console.log(board_tiles[0].length);
initialize_curr_selection();
initialize_sounds();














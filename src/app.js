
//---Get the basic elements of the board
const board = document.querySelector('#board');
const tiles = document.querySelectorAll('.tile'); // not used yet
const sound_rows = document.querySelector('.sound-rows');
const bar_markers = document.querySelectorAll('.mark-tile');
const play_button = document.querySelector('#play-button');
const reset_button = document.querySelector('#reset-button');
const setup_context = document.querySelector('#setup-context');

const effect_control=document.querySelector('#effect_drop');


const bpm_area = document.querySelector('#bpm-area');
const bpm_text = document.querySelector('#bpm-text');
const bpm_range = document.querySelector('#bpm-range');


let context;

let timeManager; // the worker that manages the sound-queue
let animationWorker; // the worker that manages the top-bar animation

const relative_path = '../assets/audio/';
const kit_type = ['trap/','techno/','future/','boombap/'];
let current_kit = kit_type[1];  // keeps track of which kit we are on so that the correct sound is played
const fileNames = ['kick.wav', 'snare.wav','clap.wav', 'tomb.wav','openhat.wav', 'hat.wav'];
const kit_collection = {}; //will contain the sounds.


const max_tiles = 16; //todo if we add a tile add/reduce then this needs to become a variable not a const 
const sound_num = 6;
let tempo  = 100; // our base tempo
const time_signature = 4; // beats per bar
const check_queue = 30; // how frequently the worker should check the queue in millisecs


let bar_iterator = 0; //keeps track of the step that should be played
let next_bar_time = 0.0; // the time that the next set of sounds will be scheduled to play


let sample_queue = []; // the ahead-of-time queue the sounds are put in

let control=[];//for sliders
const volumeNode=[];//for maingainnode
const reverbNode=[];//for reverbgainNode


let reverbch=false;//for knowing when user chooses to change the reverb

// handles start-stop
let play = false;
let play_interval; //not used yet

let animation_interval; // not used yet
let bar_animator = 0; //keeps track of the step that should be animated



// -- sound collections --


// it is an object with 16 keys - 1 for each time
// we add the sounds to be played in the respective key
// for example currSample[0] contains all the sounds to be played
// in the first column of the kit (maximum 8 sounds)
let currSample = {};
let onList = []; //keeps track of the on-tiles that need to be reset in some cases.



const bpm_step = 5;
const temp_max = parseInt(bpm_text.max);
const temp_min = parseInt(bpm_text.min);

// -- event-listeners + their functions --



setup_context.addEventListener('click',(e)=>{
    //the gesture needed for the app to properly setup
    
    if(context === undefined){
        context = new AudioContext();
    }
    main();
    setup_context.remove();
})


function setupOnClickListeners(){
    sound_rows.addEventListener('click',clickTile);
    play_button.addEventListener('click',playBoard);
    reset_button.addEventListener('click',resetSample);

    effect_control.addEventListener('change',changeEff,false);
    let gainers=document.querySelectorAll('[class*="gainer"]');
    for(g of gainers){
        control.push(g.value)
        g.addEventListener('input',changeGain,false);
    }
    //reverbControl1.addEventListener('input',changeReverb,false);
    

    bpm_area.addEventListener('change',(e)=>{
        if(e.target.tagName.toLowerCase() == 'input'){bpmEdit(e.target);}
    });

}

function clickTile(e){
    // if a tile is clicked :
    // 1. it changes color 2. I toggle its status on the board matrix
    // 3. I need to add the respective sound + position in the sample
    // so that it can be played when we press play
    if (e.target.classList.contains('tile')) {
        e.target.classList.toggle('tile-on');
        const parent = e.target.parentElement;
        const sound_row = +parent.dataset.row;
        const curr_step = +e.target.dataset.tile;
        if (e.target.className == 'tile tile-on') {
            playSound(sound_row);
            updateCurrentSample(sound_row, curr_step, true);
            onList.push(e.target);
        }
        else {
            updateCurrentSample(sound_row,curr_step, false);
            onList.splice(onList.indexOf(e.target),1);
        }

    }
}



function playBoard(e){
    // if play button is clicked change its color
    e.target.classList.toggle('func-button-on');
    play = !play;
    console.log(play, ' play', typeof play);
    if (play) {
        console.log('Worker start playing!');
        bar_iterator = 0;
        bar_animator = -1;
        next_bar_time = context.currentTime;
        timeManager.postMessage('start');
        animationWorker.postMessage('start');

    }
    else {
        timeManager.postMessage('stop');
        animationWorker.postMessage('stop');
        window.cancelAnimationFrame(bar_animation);
        resetBarTracker();
        bar_tracker = null;
    }
}

function changeGain(e) {
    if(e.target.className.startsWith('volume')) {
        control[parseInt(e.target.id.slice(-1))-1]=e.target.value;
        volumeNode[parseInt(e.target.id.slice(-1))-1].gain.value=control[parseInt(e.target.id.slice(-1))-1];
    }
    if(e.target.className.startsWith('reverb')) {
        control[parseInt(e.target.id.slice(-1))-1]=e.target.value;
        reverbNode[parseInt(e.target.id.slice(-1))-1].gain.value=control[parseInt(e.target.id.slice(-1))-1];
    }
}
function changeReverb(e){
    reverbNode[parseInt(e.target.id.slice(-1))-1].gain.value=reverbControl[parseInt(e.target.id.slice(-1))-1].value;
}
function changeEff(){
    let gainerslabels=document.querySelectorAll('#gainerlab')
    for(let g of gainerslabels){
        g.innerHTML=effect_control.value;
    }
    let gainers=document.querySelectorAll('[class*="gainer"]');
    for(let g of gainers){
        g.className=effect_control.value+"gainer"+g.id.slice(-1);
    }
    if(gainers[0].className.startsWith('volume')){
        for(let g of gainers){
            g.value=volumeNode[parseInt(g.id.slice(-1))-1].gain.value;
            control[parseInt(g.id.slice(-1))-1]=g.value;
        }
    }
    if(gainers[0].className.startsWith('reverb')){//reverb changing for the first time
        for(let g of gainers){
            g.value=reverbNode[parseInt(g.id.slice(-1))-1].gain.value;
            control[parseInt(g.id.slice(-1))-1]=g.value;
         }
    }
}

// -- other functions --


function bar_animation(){
    bar_animator++;
    if(bar_animator == 16){
        bar_animator = 0;
    }

    let curr_tile = bar_animator;
    let prev_tile = curr_tile == 0 ? 15 : curr_tile-1;
    bar_markers[curr_tile].classList.add('animate-tile');
    bar_markers[prev_tile].classList.remove('animate-tile');
}



function resetBarTracker(){
    //used when the play button is off to reset the color of the tiles
    for(let bar of bar_markers){bar.classList.remove('animate-tile');}
}

function updateQueue(){
    //this function runs even if play button is not pressed to schedule ahead
    //periodically adds the currSample steps to be played next
    //(timeManager worker manages this function)
    //ahead of time so that the sound delay is reduced.
    //the loop plays while there are bars to be added in the queue

    while(next_bar_time < context.currentTime+0.1){
        addInQueue(bar_iterator,next_bar_time);
        incrementNextBarTime();
    }
}


function addInQueue(bar_iterator,next_bar_time){
    //adds an object to the queue that consists of the array of audio buffers in
    //currSample dictionary + a time that works as the delay in which the sound
    //should be played when the start button is clicked.
    
    sample_queue.push({sample:currSample[bar_iterator],time:next_bar_time});//pushes a whole step that needs to be played

    if(sample_queue.length>0)
    {
        let next_sample = sample_queue.shift();
        if(play){playStep(next_sample['sample'],next_sample['time']);}
        console.log('removing from sample');
    }
    else{console.log('sample queue is empty');}

}

function incrementNextBarTime(){
    next_bar_time+=calculateSoundDelay(); //the next-sound should play after some time defined by
    //the tempo the number of bars the time_signature etc. so it gets added.
    bar_iterator++;
    if(bar_iterator == max_tiles){
        bar_iterator = 0;
    }
}

function playStep(step,start_time) {
    // is passed an array containing samples to be played in sync
    console.log(step)
    const index=step.map((item, i) => ({ item, i }))
    .filter(s=> s.item!=0);
    
    console.log(index)
    for(let s of index){
        console.log(index["index"])
        let bs = context.createBufferSource();
        bs.buffer = s.item;
        convolver=context.createConvolver();
        convolver.buffer=bs.buffer;
        bs.connect(convolver);
        convolver.connect(reverbNode[s.i])
        bs.connect(volumeNode[s.i]);
        bs.connect(convolver);
        reverbNode[s.i].connect(context.destination);
        volumeNode[s.i].connect(context.destination);
        bs.start(start_time);
        
    }
    
}



function updateCurrentSample(sound_row, curr_step, add) {
    // adds the sound to the time it should be played at
    // with the other sounds it will be played
    if (add) { 
        currSample[curr_step][sound_row] = kit_collection[current_kit][sound_row];
    }
    else { 
        currSample[curr_step][sound_row] = 0; 
    }
}

function resetSample(){
    for(let tile of onList){
        tile.classList.remove('tile-on');
    }
    for(let key of Object.keys(currSample)){
        currSample[key] = Array(sound_num).fill(0);
    }
}


function playSound(kit_position) {
    // play the sound that corresponds to a specific row.
    const sound = context.createBufferSource();
    sound.buffer = kit_collection[current_kit][kit_position];
    convolver=context.createConvolver();
    convolver.buffer=sound.buffer;
    sound.connect(convolver);
    convolver.connect(reverbNode[kit_position]);
    reverbNode[kit_position].connect(context.destination)
    sound.connect(volumeNode[kit_position])
    volumeNode[kit_position].connect(context.destination); 
    sound.start(context.currentTime);
}


function bpmEdit(input_clicked){
    //when someone  changes bpm
    let curr_temp = parseInt(input_clicked.value);

    if(curr_temp<=temp_max && curr_temp>=temp_min){
       tempo = curr_temp;
    }else if(curr_temp>temp_max){
        tempo = temp_max;
    }
    else if(curr_temp<temp_min){
        tempo = temp_min;;
    }
    

    bpm_text.value = tempo;
    bpm_range.value = tempo;

    animationWorker.postMessage(["change",calculateSoundDelay()]);

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
    for (let type of  kit_type){
        for (let name of fileNames) {
            console.log(`pushing ${relative_path}${type}${name}`);
            const sound = await getSound(relative_path + type + name);
            kit_collection[type].push(sound);
        }
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

function initializeKitCollection(){
    //initializes the object that contains all the kits-> kit_name : [....array with respective sounds....]
    for(let kit of kit_type){
        kit_collection[kit] = [];
    }
}

async function initialize_range(){
    let gainers=document.querySelectorAll('[class*="volumegainer"]');
    for(let g of gainers){
        control.push(g.value);//push slider to volume control
        gainNode=context.createGain();
        gainNode.gain.value=control[parseInt(g.id.slice(-1))-1]; 
        volumeNode.push(gainNode);//push the gain node
        gainNode=context.createGain();
        gainNode.gain.value=0;
        reverbNode.push(gainNode);//push the reverb node
    }
    
}

function main(){
    initialize_curr_selection();
    initializeKitCollection();
    initialize_sounds();
    setupOnClickListeners();
    initialize_range();
    timeManager = new Worker('timeManager.js');
    animationWorker = new Worker('barAnimationManager.js');
    timeManager.onmessage = (e)=>{
        if(e.data == 'runnin'){
            //call the updateQueue each time worker responds with runnin
            updateQueue();      
        }
        else{
            console.log('timeManager status ',e.data);
        }
    };
    timeManager.postMessage(["change" , check_queue]);

    animationWorker.onmessage  = (e)=>{
        if(e.data == 'animate'){
            //call the animation function if worker responds with animate
            requestAnimationFrame(bar_animation);
        }
        else{
            console.log('animation worker status',e.data);
        }
    }
    animationWorker.postMessage(["change",calculateSoundDelay()]);
}













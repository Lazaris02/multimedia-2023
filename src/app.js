
//---Get the basic elements of the board
const board = document.querySelector('#board');
const tiles = document.querySelectorAll('.tile'); // not used yet
const sound_rows = document.querySelector('.sound-rows');
const bar_markers = document.querySelectorAll('.mark-tile');
const play_button = document.querySelector('#play-button');
const reset_button = document.querySelector('#reset-button');
const setup_context = document.querySelector('#setup-context');

const effect_control=document.querySelector('#effect_drop');

const kit_drop = document.querySelector('#kit-drop');
const tabs = document.querySelector('#tabs');
const demos = document.querySelector('#demos');
const body = document.querySelector('body');

const bpm_area = document.querySelector('#bpm-area');
const bpm_text = document.querySelector('#bpm-text');
const bpm_range = document.querySelector('#bpm-range');
const save_button = document.querySelector('#save-button');
const load_button = document.querySelector('#load-button');

let context;

let timeManager; // the worker that manages the sound-queue
let animationWorker; // the worker that manages the top-bar animation

const relative_path = '../assets/audio/';
const kit_type = ['trap/','techno/','future/','boombap/'];
let current_kit = kit_type[0];  // keeps track of which kit we are on so that the correct sound is played
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

const volumeNode=[];//for maingainnodes
const reverbNode=[];//for reverbgainNodes
const panNode=[];//for pangainNodes
const delayNode=[];//for delayNodes
const delay=[];//for actual delay (to change the delayTime)
let pitch=[];//for assinging values to pitch
let delayTime=[]//for assigning values to delay time


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
let demoList = {}; // an object that will store a demoID as a key and a demo array as value



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

    tabs.addEventListener('click', clickTab);
    body.addEventListener('keydown',pressTab);
    body.addEventListener('keyup', unpressTab);
    kit_drop.addEventListener('change', changeKit);
    demos.addEventListener('click', clickDemo);

    effect_control.addEventListener('change',changeEff,false);
    let gainers=document.querySelectorAll('[class*="gainer"]');
    for(g of gainers){
        control.push(g.value)
        g.addEventListener('input',changeGain,false);
    }
    

    bpm_area.addEventListener('change',(e)=>{
        //if I change any of the two inputs for the bpm
        //I need to restart the play (stop and then start simply)
        if(e.target.tagName.toLowerCase() == 'input'){
            bpmEdit(e.target);
            if(play){
                stopBoard();
                startBoard();
            }
        }
    });

    save_button.addEventListener('click',saveCurrentBoard);
    load_button.addEventListener('click',loadSavedBoard);


}

function clickTile(e){
    // if a tile is clicked :
    // 1. it changes color 2. I toggle its status on the board matrix
    // 3. I need to add the respective sound + position in the sample
    // so that it can be played when we press play
    if (e.target.classList.contains('tile')) {
        e.target.classList.toggle('tile-on');
        const temp_parent = e.target.parentElement;
        const parent = temp_parent.parentElement;
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
    //also change the play-state and depending on where 
    //we land we trigger the start/stopBoard()
    e.target.classList.toggle('func-button-on');
    play = !play;
    console.log(play, ' play', typeof play);
    if (play) {startBoard();}else{stopBoard();}
}

function startBoard(){
    //performs all the necessary actions for the 
    //board to start playing (from the beggining of the board)
    //can be called from play board or bpm-eventListener
    play = true;
    bar_iterator = 0;
    bar_animator = -1;
    next_bar_time = context.currentTime;
    timeManager.postMessage('start');
    animationWorker.postMessage('start');

}


function stopBoard(){
    //performs all the necessary actions for the 
    //board to stop playing
    //can be called from play board or bpm-eventListener
    play=false;
    timeManager.postMessage('stop');
    animationWorker.postMessage('stop');
    window.cancelAnimationFrame(bar_animation);
    resetBarTracker();
    bar_tracker = null;
}

function saveCurrentBoard(){
    //if the user wants to save their temporary board only if not playing
    if(play){return}
    tempSave = [...onList]; // copies the current board
}

function loadSavedBoard(demoNum=-1){
    //demonumber : -1 if not for the demo 1...max_num for each demo 
    //can't be loaded while playing
    //if not playing just load every tile in the tempSave
    if(play){return}
    //first reset the current sample
    resetSample();
    //then just load the demo or current-save into the sample 
    let parent;
    let sound_row;
    let curr_step;

    const toLoad = (demoNum == -1) ? tempSave : demoList[demoNum];

    for(let tile of toLoad){
        parent = tile.parentElement.parentElement;
        sound_row = +parent.dataset.row;
        curr_step = +tile.dataset.tile;
        tile.classList.add('tile-on');
        updateCurrentSample(sound_row, curr_step, true);
    }
    //copy the saved board into the onList board
    onList = [...toLoad];
}

function changeGain(e) {//function for changing control value on user input
    //control value is for all effects, so we change the effect depending on the class that the slider is
    //we get set the control current value from the user input and then set the node value from the control array 
    if(e.target.className.startsWith('volume')) {//the sliders are for volume control
        control[parseInt(e.target.id.slice(-1))-1]=e.target.value;
        volumeNode[parseInt(e.target.id.slice(-1))-1].gain.value=control[parseInt(e.target.id.slice(-1))-1];
    }
    if(e.target.className.startsWith('reverb')) {//the sliders are for reverb control
        control[parseInt(e.target.id.slice(-1))-1]=e.target.value;
        reverbNode[parseInt(e.target.id.slice(-1))-1].gain.value=control[parseInt(e.target.id.slice(-1))-1];
    }
    if(e.target.className.startsWith('pan')) {//the sliders are for pan control
        control[parseInt(e.target.id.slice(-1))-1]=e.target.value;
        panNode[parseInt(e.target.id.slice(-1))-1].pan.value=control[parseInt(e.target.id.slice(-1))-1];
    }
    if(e.target.className.startsWith('pitch')) {//the sliders are for pitch control
        control[parseInt(e.target.id.slice(-1))-1]=e.target.value;
        pitch[parseInt(e.target.id.slice(-1))-1]=control[parseInt(e.target.id.slice(-1))-1];
    }
    if(e.target.className.startsWith('delay')) {//the sliders are for pitch control
        control[parseInt(e.target.id.slice(-1))-1]=e.target.value;
        delayNode[parseInt(e.target.id.slice(-1))-1].gain.value=control[parseInt(e.target.id.slice(-1))-1];
    }
    if(e.target.className.startsWith('time')) {//the sliders are for pitch control
        control[parseInt(e.target.id.slice(-1))-1]=e.target.value;
        delay[parseInt(e.target.id.slice(-1))-1].delayTime.value=control[parseInt(e.target.id.slice(-1))-1];
    }
}
function changeEff(){//function for changing the effect depending on the user input
    //we must identify the effect the user chose, change the inner html value for UI, add min max value on slider depending on effect
    //,set the value of the slider from the effect array so user does not lose his choices and finaly update the control array
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
            g.min=0;
            g.max=0.8;
            g.step=0.01;
            g.value=volumeNode[parseInt(g.id.slice(-1))-1].gain.value;
            control[parseInt(g.id.slice(-1))-1]=g.value;
        }
    }
    if(gainers[0].className.startsWith('reverb')){
        for(let g of gainers){
            g.min=0;
            g.max=1;
            g.step=0.01;
            g.value=reverbNode[parseInt(g.id.slice(-1))-1].gain.value;
            control[parseInt(g.id.slice(-1))-1]=g.value;
         }
    }
    if(gainers[0].className.startsWith('pan')){
        for(let g of gainers){
            g.min=-1;
            g.max=1;
            g.step=0.01;
            g.value=panNode[parseInt(g.id.slice(-1))-1].pan.value;
            control[parseInt(g.id.slice(-1))-1]=g.value;
         }
    }
    if(gainers[0].className.startsWith('pitch')){
        for(let g of gainers){
            g.min=0.3;
            g.max=1.7;
            g.step=0.01;
            g.value=pitch[parseInt(g.id.slice(-1))-1];
            control[parseInt(g.id.slice(-1))-1]=g.value;
         }
    }
    if(gainers[0].className.startsWith('delay')){
        for(let g of gainers){
            g.min=0;
            g.max=0.8;
            g.step=0.01;
            g.value=delayNode[parseInt(g.id.slice(-1))-1].gain.value;
            control[parseInt(g.id.slice(-1))-1]=g.value;
         }
    }
    if(gainers[0].className.startsWith('time')){
        for(let g of gainers){
            g.min=0;
            g.max=1;
            g.step=0.01;
            g.value=delay[parseInt(g.id.slice(-1))-1].delayTime.value;
            control[parseInt(g.id.slice(-1))-1]=g.value;
         }
    }
}

function changeKit(){
    //function for changing the sound kits depending on the user input
    let selected_kit = kit_drop.value;

    if (selected_kit == 'trap'){
        current_kit = kit_type[0];
    }
    if (selected_kit == 'techno'){
        current_kit = kit_type[1];
    }
    if (selected_kit =='future'){
        current_kit = kit_type[2];
    }
    if (selected_kit == 'boombap'){
        current_kit = kit_type[3];
    }

}

function clickTab(e){
    //function for playing the appropriate sound when the user clicks on a tab
    if (e.target.className == 'tab'){
        const position = e.target.value;
        playSound(position);
    }
}

function pressTab(e){
    //function for playing the sounds when some specific keys of the keyboard are pressed
    if (context === undefined){
        return;
    }
    let key = e.key;

    if (key == 'a'){
        pos = 0;
    }
    else if (key == 's'){
        pos = 1;
    }
    else if (key == 'd'){
        pos = 2;
    }
    else if (key == 'j'){
        pos = 3;
    }
    else if (key == 'k'){
        pos = 4;
    }
    else if (key == 'l'){
        pos = 5;
    }
    else{
        return;
    }
    tabs.children[pos].classList.add('tab-pressed'); 
}

function unpressTab(e){
    //function for the effect of unpressing the tabs
    let key = e.key;

    if (key == 'a'){
        pos = 0;
    }
    else if (key == 's'){
        pos = 1;
    }
    else if (key == 'd'){
        pos = 2;
    }
    else if (key == 'j'){
        pos = 3;
    }
    else if (key == 'k'){
        pos = 4;
    }
    else if (key == 'l'){
        pos = 5;
    }
    else{
        return;
    }
    tabs.children[pos].classList.remove('tab-pressed'); 
    playSound(pos);
}

function clickDemo(e){
    if (!e.target.classList.contains('demo')){return}
    loadSavedBoard(e.target.dataset.demoid);
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
    
    
    for(let s of index){//for each s, connect the effects for the output
        console.log(index["index"])
        let bs = context.createBufferSource();
        bs.buffer = s.item;
        convolver=context.createConvolver();
        convolver.buffer=bs.buffer;
        bs.playbackRate.value=pitch[s.i];
        bs.connect(convolver);
        convolver.connect(reverbNode[s.i]);
        bs.connect(delayNode[s.i]);
        bs.connect(volumeNode[s.i]);
        bs.connect(panNode[s.i])
        reverbNode[s.i].connect(volumeNode[s.i]);
        panNode[s.i].connect(volumeNode[s.i]);
        delayNode[s.i].connect(volumeNode[s.i]);
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
    console.log(onList);
    for(let tile of onList){
        tile.classList.remove('tile-on');
    }
    for(let key of Object.keys(currSample)){
        currSample[key] = Array(sound_num).fill(0);
    }
    onList = [];
}


function playSound(kit_position) {
    // play the sound that corresponds to a specific row.
    // before playing, connect each sound to the effects 
    const sound = context.createBufferSource();
    sound.buffer = kit_collection[current_kit][kit_position];
    convolver=context.createConvolver();
    convolver.buffer=sound.buffer;
    sound.playbackRate.value=pitch[kit_position];
    sound.connect(convolver);
    convolver.connect(reverbNode[kit_position]);
    sound.connect(delayNode[kit_position]);
    sound.connect(volumeNode[kit_position]);
    sound.connect(panNode[kit_position]);
    reverbNode[kit_position].connect(volumeNode[kit_position]);
    panNode[kit_position].connect(volumeNode[kit_position]);
    delayNode[kit_position].connect(volumeNode[kit_position]);
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

function initializeDemos(){
    //this will be used to initialize the demoList object 
    //with key-value pairs of key:demoId value:array like onList but filled with samples 

}

function initialize_curr_selection() {
    
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

async function initialize_range(){//initialize the nodes needed for the effects, init the control array, connects all gainers to correct nodes 
    let gainers=document.querySelectorAll('[class*="volumegainer"]');
    for(let g of gainers){
        control.push(g.value);//push sliders
        pitch.push(1);//initialize pitch (default sound)
        gainNode=context.createGain();
        gainNode.gain.value=0.3; 
        volumeNode.push(gainNode);//push the gain node
        gainNode=context.createGain();
        gainNode.gain.value=0;
        reverbNode.push(gainNode);//push the reverb node
        gainNode=new StereoPannerNode(context);
        gainNode.pan.value=0;
        panNode.push(gainNode);//push pan node
        delaytemp = context.createDelay();
        delaytemp.delayTime.value = 0.3;
        gainNode=context.createGain();
        gainNode.gain.value=0;
        delaytemp.connect(gainNode);
        gainNode.connect(delaytemp);
        delayNode.push(gainNode);//push gain node
        delay.push(delaytemp);
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













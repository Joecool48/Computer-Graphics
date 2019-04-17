var I_VERTEX_COLOR_ORANGE = [232.0 / 256, 74.0 / 256, 39.0 / 256];
var I_VERTEX_COLOR_BLUE = [19.0 / 256, 41.0 / 256, 75.0 / 256];

var BLUE_WIDTH = .015; // Width of the blue border on the I

var matrix = mat4.create(); // Matrix for everything

var lastTime = 0; // For interpolation while animating
var scale = 1.0;
var rotAngle = 0;
var posX = 0;
var posY = 0;
var scaleX = 1.0;
var scaleY = 1.0;

var matrixStack = [];

function pushMatrix() {
    matrixStack.push(mat4.clone(matrix));
}
function popMatrix() {
    matrix = matrixStack.pop();
}



/**
 * @file A simple WebGL example drawing a triangle with colors
 * @author Eric Shaffer <shaffer1@eillinois.edu>
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global A simple GLSL shader program */
var shaderProgram;

/** @global The WebGL buffer holding the triangle */
var vertexPositionBuffer;

/** @global The WebGL buffer holding the vertex colors */
var vertexColorBuffer;

/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas) {
  var context = null;
  context = canvas.getContext("webgl");
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

function setMatrixUniforms() {
  gl.uniformMatrix4fv(shaderProgram.matrixUniform, false, matrix);
}

function degToRad(degrees) {
  return degrees * Math.PI / 180;
}

/**
 * Loads Shaders
 * @param {string} id ID string for shader to load. Either vertex shader/fragment shader
 */
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);

  // If we don't find an element with the specified id
  // we do an early exit
  if (!shaderScript) {
    return null;
  }

  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }

  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }

  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

/**
 * Setup the fragment and vertex shaders
 */
function setupShaders() {
  vertexShader = loadShaderFromDOM("i-logo-vertex-shader");
  fragmentShader = loadShaderFromDOM("i-logo-fragment-shader");

  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);
  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
  shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
  gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);
  shaderProgram.matrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");


}

/**
 * Populate buffers with data
 */
function setupBuffers() {
  vertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  // Generate the orange stuff
  var orangeTriangleVertices = [
    /* Top part of I */
    -.4, -.5, 0,
    -.4, -.3, 0,
    -.2, -.3, 0,
    -.2, -.3, 0,
    -.2, -.5, 0,
    -.4, -.5, 0,
    -.2, -.5, 0,
    -.2, -.3, 0,
    .2, -.3, 0,
    .2, -.3, 0,
    .2, -.5, 0,
    -.2, -.5, 0,
    .2, -.5, 0,
    .2, -.3, 0,
    .4, -.3, 0,
    .4, -.3, 0,
    .4, -.5, 0,
    .2, -.5, 0,
    /* Middle part of I */
    -.2, -.3, 0,
    -.2, .3, 0,
    .2, .3, 0,
    .2, .3, 0,
    .2, -.3, 0,
    -.2, -.3, 0,
    /* Bottom part of I */
    -.4, .3, 0,
    -.4, .5, 0,
    -.2, .3, 0,
    -.2, .3, 0,
    -.2, .5, 0,
    -.4, .5, 0,
    -.2, .3, 0,
    .2, .3, 0,
    -.2, .5, 0,
    -.2, .5, 0,
    .2, .5, 0,
    .2, .3, 0,
    .2, .3, 0,
    .4, .3, 0,
    .4, .5, 0,
    .4, .5, 0,
    .2, .5, 0,
    .2, .3, 0
  ];
  var colors = [];
  for (var i = 0; i < orangeTriangleVertices.length / 3; i++) {
    colors.push(I_VERTEX_COLOR_ORANGE[0]);
    colors.push(I_VERTEX_COLOR_ORANGE[1]);
    colors.push(I_VERTEX_COLOR_ORANGE[2]);
    colors.push(1.0); // Alpha value of 1
  }
  blueTriangleVertices = [
    .4, -.5, 0,
    .4 + BLUE_WIDTH, -.5, 0,
    .4 + BLUE_WIDTH, -.3, 0,
    .4, -.5, 0,
    .4, -.3, 0,
    .4 + BLUE_WIDTH, -.3, 0,

    -.4, .3, 0,
    -.4, .5, 0,
    -.4 - BLUE_WIDTH, .3, 0,
    -.4 - BLUE_WIDTH, .3, 0,
    -.4 - BLUE_WIDTH, .5, 0,
    -.4, .5, 0,

    -.4, -.5, 0,
    -.4, -.3, 0,
    -.4 - BLUE_WIDTH, -.3, 0,
    -.4 - BLUE_WIDTH, -.3, 0,
    -.4 - BLUE_WIDTH, -.5, 0,
    -.4, -.5, 0,

    .4, .3, 0,
    .4 + BLUE_WIDTH, .3, 0,
    .4, .5, 0,
    .4, .5, 0,
    .4 + BLUE_WIDTH, .5, 0,
    .4 + BLUE_WIDTH, .3, 0,

    -.4 - BLUE_WIDTH, -.5, 0,
    .4 + BLUE_WIDTH, -.5, 0,
    .4 + BLUE_WIDTH, -.5 - BLUE_WIDTH, 0,
    .4 + BLUE_WIDTH, -.5 - BLUE_WIDTH, 0,
    -.4 - BLUE_WIDTH, -.5 - BLUE_WIDTH, 0,
    -.4 - BLUE_WIDTH, -.5, 0,

    -.4 - BLUE_WIDTH, .5, 0,
    .4 + BLUE_WIDTH, .5, 0,
    .4 + BLUE_WIDTH, .5 + BLUE_WIDTH, 0,
    .4 + BLUE_WIDTH, .5 + BLUE_WIDTH, 0,
    -.4 - BLUE_WIDTH, .5 + BLUE_WIDTH, 0,
    -.4 - BLUE_WIDTH, .5, 0,

    .2, -.3, 0,
    .2 + BLUE_WIDTH, -.3, 0,
    .2, .3, 0,
    .2, .3, 0,
    .2 + BLUE_WIDTH, .3, 0,
    .2 + BLUE_WIDTH, -.3, 0,

    -.2, -.3, 0,
    -.2 - BLUE_WIDTH, -.3, 0,
    -.2, .3, 0,
    -.2, .3, 0,
    -.2 - BLUE_WIDTH, .3, 0,
    -.2 - BLUE_WIDTH, -.3, 0,

    -.4 - BLUE_WIDTH, -.3, 0,
    -.2, -.3, 0,
    -.2, -.3 + BLUE_WIDTH, 0,
    -.2, -.3 + BLUE_WIDTH, 0,
    -.4 - BLUE_WIDTH, -.3 + BLUE_WIDTH, 0,
    -.4 - BLUE_WIDTH, -.3, 0,

    -.4 - BLUE_WIDTH, .3, 0,
    -.2, .3, 0,
    -.2, .3 - BLUE_WIDTH, 0,
    -.2, .3 - BLUE_WIDTH, 0,
    -.4 - BLUE_WIDTH, .3 - BLUE_WIDTH, 0,
    -.4 - BLUE_WIDTH, .3, 0,

    .2 + BLUE_WIDTH, -.3, 0,
    .4 + BLUE_WIDTH, -.3, 0,
    .4 + BLUE_WIDTH, -.3 + BLUE_WIDTH, 0,
    .4 + BLUE_WIDTH, -.3 + BLUE_WIDTH, 0,
    .2 + BLUE_WIDTH, -.3 + BLUE_WIDTH, 0,
    .2 + BLUE_WIDTH, -.3, 0,

    .2 + BLUE_WIDTH, .3, 0,
    .4 + BLUE_WIDTH, .3, 0,
    .4 + BLUE_WIDTH, .3 - BLUE_WIDTH, 0,
    .4 + BLUE_WIDTH, .3 - BLUE_WIDTH, 0,
    .2 + BLUE_WIDTH, .3 - BLUE_WIDTH, 0,
    .2 + BLUE_WIDTH, .3, 0
  ];
  // Shove them into the same buffer
  var triangleVertices = orangeTriangleVertices.concat(blueTriangleVertices);


  // Fill blue colors
  for (var i = 0; i < blueTriangleVertices.length / 3; i++) {
    colors.push(I_VERTEX_COLOR_BLUE[0]);
    colors.push(I_VERTEX_COLOR_BLUE[1]);
    colors.push(I_VERTEX_COLOR_BLUE[2]);
    colors.push(1.0);
  }

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.STATIC_DRAW);
  vertexPositionBuffer.itemSize = 3;
  vertexPositionBuffer.numberOfItems = triangleVertices.length / 3;

  vertexColorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
  vertexColorBuffer.itemSize = 4;
  vertexColorBuffer.numItems = colors.length / 4;
}

/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function draw() {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute,
                         vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexColorAttribute,
                            vertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute)

  setMatrixUniforms(); // Set the matrix for animation

  gl.drawArrays(gl.TRIANGLES, 0, vertexPositionBuffer.numberOfItems);
}

function trans(newX, newY) {
  posX += newX - posX;
  posY += newY - posY;
  mat4.translate(matrix, matrix, vec3.fromValues(posX, posY, 0));

}

function rot(degrees) {
    oldX = posX;
    oldY = posY;
    rotAngle += degrees;
    rads = degToRad(rotAngle);
    trans(0, 0);
    mat4.rotateZ(matrix, matrix, rotAngle);
    trans(oldX, oldY);
}

function scal(xx, yy) {
    //temp = mat4.create();
    scale = vec3.fromValues(xx, yy, 1);
    scaleX = xx;
    scaleY = yy;
    mat4.scale(matrix, matrix, scale);
}

// function scale(u) {
//     return scale(u, u);
// }

// The update section of the code
function animate() {
  var timeNow = new Date().getTime();
  if (lastTime != 0) {
    mat4.identity(matrix);
    var elapsed = timeNow - lastTime;
    trans(.1, .2);
    rot(.05);
    console.log("X: " + posX);
  }
  lastTime = timeNow;
}

function tick() {
  requestAnimationFrame(tick);
  draw();
  animate();
}

/**
 * Startup function called from html code to start program.
 */
 function start() {
  canvas = document.getElementById("myWebGLCanvas");
  gl = createGLContext(canvas);
  setupShaders();
  setupBuffers();
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.enable(gl.DEPTH_TEST); // Enable depth bit

  tick(); // Called once every frame with the animation
}

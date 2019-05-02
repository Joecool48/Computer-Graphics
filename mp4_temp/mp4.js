

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global The list of all sphere objects rendered onto the screen */
var sphereList = [];

var pMatrix = mat4.create() // the perspective matrix

var spheresProgram;

var cameraPos = vec3.fromValues(0, 0, -2);
var viewPoint = vec3.fromValues(0, 0, 0);
var upVec = vec3.fromValues(0, 1, 0);

var vMatrix = mat4.create()

var fieldOfViewRadians = degToRad(60)

function radToDeg(r) {
  return r * 180 / Math.PI;
}

function degToRad(d) {
  return d * Math.PI / 180;
}

function startup() {
    canvas = document.getElementById("glCanvas")
    gl = createGLContext(canvas)

    var ext = gl.getExtension('OES_element_index_uint');
    if (ext ==null){
        alert("OES_element_index_uint is unsupported by your browser and terrain generation cannot proceed.");
    }
    else{
        console.log("OES_element_index_uint is supported!");
    }

    setupShaders()

    getLocations()


    // Clear the canvas AND the depth buffer.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.clearColor(0.0,0.0,0.0,1.0)
    gl.enable(gl.DEPTH_TEST);
    createSphere() // do work to load sphere buffers with tesselation

    sphereList.push(new Sphere(.25, [.8,.8,0], [0,0,-.001]))

    requestAnimFrame(update) // start the sim

}

function uploadUniforms() {
    gl.uniformMatrix4fv(spheresProgram.pMatrixUniform,
                      false, pMatrix);
    gl.uniform3fv(spheresProgram.cameraPosUniform, cameraPos)
}

function updateSpheres() {
    // draw all the spheres
    for (let i = 0; i < sphereList.length; i++) {
        sphereList[i].update()
        sphereList[i].draw()
    }
}

function update() {
    // update the screen to show new stuff
    gl.viewport(0, 0, canvas.width, canvas.height);

    mat4.lookAt(vMatrix, cameraPos, viewPoint, upVec)

    //mat4.invert(vMatrix, vMatrix) // invert camera to get view

    // Compute the projection matrix

    var aspect = canvas.width / canvas.height;
    mat4.perspective(pMatrix, fieldOfViewRadians, aspect, 1, 2000);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    uploadUniforms()

    updateSpheres()

    requestAnimFrame(update)

}

function getLocations() {
    spheresProgram.mvMatrixUniform = gl.getUniformLocation(spheresProgram, "uMVMatrix")
    spheresProgram.pMatrixUniform = gl.getUniformLocation(spheresProgram, "uPMatrix")
    spheresProgram.cameraPosUniform = gl.getUniformLocation(spheresProgram, "uCameraPos")

    spheresProgram.nMatrixUniform = gl.getUniformLocation(spheresProgram, "nMatrix")

    // lighting uniforms
    spheresProgram.uniformLightPositionLoc = gl.getUniformLocation(spheresProgram, "uLightPosition");
    spheresProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(spheresProgram, "uAmbientLightColor");
    spheresProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(spheresProgram, "uDiffuseLightColor");
    spheresProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(spheresProgram, "uSpecularLightColor");
    spheresProgram.uniformDiffuseMaterialColor = gl.getUniformLocation(spheresProgram, "uDiffuseMaterialColor");
    spheresProgram.uniformAmbientMaterialColor = gl.getUniformLocation(spheresProgram, "uAmbientMaterialColor");
    spheresProgram.uniformSpecularMaterialColor = gl.getUniformLocation(spheresProgram, "uSpecularMaterialColor");
    spheresProgram.uniformShininess = gl.getUniformLocation(spheresProgram, "uShininess");


    spheresProgram.vertexNormalAttribute = gl.getAttribLocation(spheresProgram, "aVertexNormal")
    gl.enableVertexAttribArray(spheresProgram.vertexNormalAttribute)

    spheresProgram.vertexPositionAttribute = gl.getAttribLocation(spheresProgram, "aVertexPosition")
    gl.enableVertexAttribArray(spheresProgram.vertexPositionAttribute)
}

function setupShaders() {
    var vertexShader = loadShaderFromDOM("sphere-shader-vs");
    var fragmentShader = loadShaderFromDOM("sphere-shader-fs");


    spheresProgram = gl.createProgram();
    gl.attachShader(spheresProgram, vertexShader);
    gl.attachShader(spheresProgram, fragmentShader);
    gl.linkProgram(spheresProgram);

    if (!gl.getProgramParameter(spheresProgram, gl.LINK_STATUS)) {
      alert("Failed to setup shaders");
    }

    gl.useProgram(spheresProgram)

}



//----------------------------------------------------------------------------------
/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

//----------------------------------------------------------------------------------
/**
 * Loads Shaders
 * @param {string} id ID string for shader to load. Either vertex shader/fragment shader
 */
function loadShaderFromDOM(id) {
    console.log("Loading shader " + id);
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
      console.log("Shader compilation failed")
    return null;
  }
  return shader;
}

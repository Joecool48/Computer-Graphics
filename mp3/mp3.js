

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global The Normal matrix */
var nMatrix = mat3.create();

/** @global The Modelview matrix */
var mvMatrix = mat4.create();

/** @global The matrix stack for hierarchical modeling */
var mvMatrixStack = [];

/** @global An object holding the geometry for a 3D mesh */
var myMesh;

//Light parameters
/** @global Light position in VIEW coordinates */
var lightPosition = [1,1,1];
/** @global Ambient light color/intensity for Phong reflection */
var lAmbient = [0,0,0];
/** @global Diffuse light color/intensity for Phong reflection */
var lDiffuse = [.5,.5,.5];
/** @global Specular light color/intensity for Phong reflection */
var lSpecular =[0,0,0];

//Material parameters
/** @global Ambient material color/intensity for Phong reflection */
var kAmbient = [.25,.25,.25];
/** @global Diffuse material color/intensity for Phong reflection */
var kTerrainDiffuse = [192/255,192/255,192/255];
/** @global Specular material color/intensity for Phong reflection */
var kSpecular = [0.0,0.0,0.0];
/** @global Shininess exponent for Phong reflection */
var shininess = 23;
/** @global Edge color fpr wireframeish rendering */
var kEdgeBlack = [0.0,0.0,0.0];
/** @global Edge color for wireframe rendering */
var kEdgeWhite = [1.0,1.0,1.0];



var shaderProgram;

var skyboxPositionBuffer;
var skyboxTexture;
var cubeShaderProgram;

var pMatrix = mat4.create();
var vMatrix = mat4.create();

var rotY = 0;
var cameraPos = vec3.fromValues(0, 0, 1);
var viewPoint = vec3.fromValues(0, 0, 0);
var upVec = vec3.fromValues(0, 1, 0);

// the host and port of the node fileserver (root of server)
var hostUrl = "http://localhost:8080/";

// the teapot file's name
var render_mesh_name = "teapot.obj";

function radToDeg(r) {
  return r * 180 / Math.PI;
}

function degToRad(d) {
  return d * Math.PI / 180;
}

//-------------------------------------------------------------------------
/**
 * Sends Modelview matrix to shader
 */
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//-------------------------------------------------------------------------
/**
 * Sends projection matrix to shader
 */
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform,
                      false, pMatrix);
}

//-------------------------------------------------------------------------
/**
 * Generates and sends the normal matrix to the shader
 */
function uploadNormalMatrixToShader() {
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

//----------------------------------------------------------------------------------
/**
 * Pushes matrix onto modelview matrix stack
 */
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}


//----------------------------------------------------------------------------------
/**
 * Pops matrix off of modelview matrix stack
 */
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

//----------------------------------------------------------------------------------
/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
    gl.uniform3fv(shaderProgram.uniformCameraPosition, cameraPos); // cameraPosition to send
}

//-------------------------------------------------------------------------
/**
 * Sends material information to the shader
 * @param {Float32} alpha shininess coefficient
 * @param {Float32Array} a Ambient material color
 * @param {Float32Array} d Diffuse material color
 * @param {Float32Array} s Specular material color
 */
function setMaterialUniforms(alpha,a,d,s) {
  gl.uniform1f(shaderProgram.uniformShininessLoc, alpha);
  gl.uniform3fv(shaderProgram.uniformAmbientMaterialColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseMaterialColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularMaterialColorLoc, s);
}

//-------------------------------------------------------------------------
/**
 * Sends light information to the shader
 * @param {Float32Array} loc Location of light source
 * @param {Float32Array} a Ambient light strength
 * @param {Float32Array} d Diffuse light strength
 * @param {Float32Array} s Specular light strength
 */
function setLightUniforms(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}


//----------------------------------------------------------------------------------
/**
 * Populate buffers with data
 */
function setupMesh(filename) {
   //Your code here
    myMesh = new TriMesh();
    var promise = asyncGetFile(filename);
    promise.then(text => {
        myMesh.loadFromOBJ(text);
        console.log("Loaded obj text");
    });
    promise.catch(err => {
        console.log("Error with fetching file");
    });
}

//-------------------------------------------------------------------------
/**
 * Asynchronously read a server-side text file
 */
function asyncGetFile(url) {
  //Your code here
    console.log("Getting text file at ", url);
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", url);
        xhr.onload = () => resolve(xhr.responseText);
        xhr.onerror = () => reject(xhr.statusText);
        xhr.send();
        console.log("Finished getting text");
    });

}


//----------------------------------------------------------------------------------
/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function drawTeapot() {
    //Draw Mesh
    //ADD an if statement to prevent early drawing of myMesh
    gl.useProgram(shaderProgram);

    if (!myMesh.loaded()) return;
        mvPushMatrix();

        var minBounds = [-1, -1, -1];
        var maxBounds = [1, 1, 1];
        myMesh.getAABB(minBounds, maxBounds);

        mat4.copy(mvMatrix, vMatrix);
        // calculate its center
        var pieceCenter = vec3.fromValues((((minBounds[0] + maxBounds[0]) / 2)) * .1, ((minBounds[1] + maxBounds[1]) / 2) * .1, .1 * ((minBounds[2] + maxBounds[2]) / 2));
        var translateVal = vec3.create();
        vec3.negate(translateVal, pieceCenter);
        mat4.translate(mvMatrix, mvMatrix, translateVal);
        mat4.rotateY(mvMatrix, mvMatrix, degToRad(rotY));

        mat4.translate(mvMatrix, mvMatrix, viewPoint);
        mat4.scale(mvMatrix, mvMatrix, vec3.fromValues(.15, .15, .15));
        // object is being rotated to coincide with spinning skybox, so it must have oppisite rotation
        mat4.rotateY(mvMatrix, mvMatrix, -degToRad(rotY));
        //mat4.translate(mvMatrix, mvMatrix, cameraPos); // move to cameraPos position
        
        // bind the earlier texture to place 0 so that webgl can use it to reflect
        
        gl.activeTexture(gl.TEXTURE0);
        // bind this texture to that point so the teapot shaders can find it 
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);
        
        // tell the teapot to use the texture for the cube map to sample reflection
        gl.uniform1i(shaderProgram.uniformEnvironmentMap, 0);     

        setMatrixUniforms();
        setLightUniforms(lightPosition,lAmbient,lDiffuse,lSpecular);

        if ((document.getElementById("polygon").checked) || (document.getElementById("wirepoly").checked))
        {
            setMaterialUniforms(shininess,kAmbient,
                                kTerrainDiffuse,kSpecular);
            myMesh.drawTriangles();
        }

         if(document.getElementById("wirepoly").checked)
         {
             setMaterialUniforms(shininess,kAmbient,
                                 kEdgeBlack,kSpecular);
             myMesh.drawEdges();
         }

         if(document.getElementById("wireframe").checked)
        {
             setMaterialUniforms(shininess,kAmbient,
                                 kEdgeWhite,kSpecular);
             myMesh.drawEdges();
        }
        mvPopMatrix();
}

//----------------------------------------------------------------------------------
//Code to handle user interaction
var currentlyPressedKeys = {};

function handleKeyDown(event) {
        //console.log("Key down ", event.key, " code ", event.code);
        currentlyPressedKeys[event.key] = true;
          if (currentlyPressedKeys["a"]) {
            // key A
            rotY-= 1;
        } else if (currentlyPressedKeys["d"]) {
            // key D
            rotY+= 1;
        }
}

function handleKeyUp(event) {
        //console.log("Key up ", event.key, " code ", event.code);
        currentlyPressedKeys[event.key] = false;
}

//----------------------------------------------------------------------------------
/**
 * Startup function called from html code to start program.
 */
 function startup() {
   document.onkeydown = handleKeyDown;
   document.onkeyup = handleKeyUp;
   main();
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

//----------------------------------------------------------------------------------
/**
 * Setup the fragment and vertex shaders
 */
function setupShaders() {
  var vertexShader = loadShaderFromDOM("shader-vs");
  var fragmentShader = loadShaderFromDOM("shader-fs");


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

  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
  shaderProgram.uniformShininessLoc = gl.getUniformLocation(shaderProgram, "uShininess");
  shaderProgram.uniformAmbientMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKAmbient");
  shaderProgram.uniformDiffuseMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKDiffuse");
  shaderProgram.uniformSpecularMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKSpecular");
  shaderProgram.uniformCameraPosition = gl.getUniformLocation(shaderProgram, "uCameraPos");

    shaderProgram.uniformEnvironmentMap = gl.getUniformLocation(shaderProgram, "uEnvironmentMap");
}

function setupCubeShaders() {
    var cubeVertexShader = loadShaderFromDOM("cube-shader-vs");
    var cubeFragmentShader = loadShaderFromDOM("cube-shader-fs");

    cubeShaderProgram = gl.createProgram();
    gl.attachShader(cubeShaderProgram, cubeVertexShader);
    gl.attachShader(cubeShaderProgram, cubeFragmentShader);
    gl.linkProgram(cubeShaderProgram);

    if (!gl.getProgramParameter(cubeShaderProgram, gl.LINK_STATUS))
        alert("Failed to setup cube shaders");

    gl.useProgram(cubeShaderProgram);

    cubeShaderProgram.cubeVertexPositionAttribute = gl.getAttribLocation(cubeShaderProgram, "aCubeVertexPosition");

    cubeShaderProgram.cubeTextureUniform = gl.getUniformLocation(cubeShaderProgram, "uCubeTexture");
    cubeShaderProgram.cubeViewDirectionProjection = gl.getUniformLocation(cubeShaderProgram, "uCubeViewDirectionProjection");
}
// main function that does almost everything
function main() {
  canvas = document.getElementById("myGLCanvas");
  console.log(canvas);
  gl = createGLContext(canvas);
  // Get extension for 4 byte integer indices for drawElements
  var ext = gl.getExtension('OES_element_index_uint');
  if (ext ==null){
      alert("OES_element_index_uint is unsupported by your browser and terrain generation cannot proceed.");
  }
  else{
      console.log("OES_element_index_uint is supported!");
  }
  setupShaders();
  setupCubeShaders(); // lookup positions in setupCubeShaders attached to program obj
  setupMesh(hostUrl + render_mesh_name);
  // Create a buffer for positions
  gl.useProgram(cubeShaderProgram);
  skyboxPositionBuffer = gl.createBuffer();
  // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
  gl.bindBuffer(gl.ARRAY_BUFFER, skyboxPositionBuffer);
  // Put the positions in the buffer
  setGeometry(gl);

  // Create a texture.
  skyboxTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);

  // create all the faces mapped to their urls
  const faceInfos = [
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
      url: hostUrl + 'pos-x.png'
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
      url: hostUrl + 'neg-x.png'
    },
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
      url: hostUrl + 'pos-y.png'
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
      url: hostUrl + 'neg-y.png'
    },
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
      url: hostUrl + 'pos-z.png'
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
      url: hostUrl + 'neg-z.png'
    },
  ];
  // add all the texture images to the buffer
  faceInfos.forEach((faceInfo) => {
    const {target, url} = faceInfo;

    // Upload the canvas to the cubemap face.
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 512;
    const height = 512;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;

    // setup each face so it's immediately renderable
    gl.texImage2D(target, level, internalFormat, width, height, 0, format, type, null);

    // Asynchronously load an image
    const image = new Image();
    image.src = url;
    // once the image loads, add its data and options to the buffer
    image.addEventListener('load', function() {
      // Now that the image has loaded make copy it to the texture.
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);
      gl.texImage2D(target, level, internalFormat, format, type, image);
      gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    });
  });
  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

  var fieldOfViewRadians = degToRad(60);

  requestAnimationFrame(drawScene);

  // Draw the scene.
  function drawScene() {
    document.getElementById("eY").value=rotY;
    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.enable(gl.DEPTH_TEST);

    // Clear the canvas AND the depth buffer.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Tell it to use our program (pair of shaders)
    gl.useProgram(cubeShaderProgram);

    // Turn on the position attribute
    gl.enableVertexAttribArray(cubeShaderProgram.cubeVertexPositionAttribute);

    // Bind the position buffer.
    gl.bindBuffer(gl.ARRAY_BUFFER, skyboxPositionBuffer);

    // Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 2;          // 2 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        cubeShaderProgram.cubeVertexPositionAttribute, size, type, normalize, stride, offset);

    // Compute the projection matrix
    var aspect = canvas.width / canvas.height;
    mat4.perspective(pMatrix, fieldOfViewRadians, aspect, 1, 2000);

    // camera going in circle 2 units from origin looking at origin
    viewPoint = vec3.fromValues(0, 0, 1.6);
    cameraPos = vec3.fromValues(0, 0, 0);

    // Compute the camera's matrix using look at.
    var cameraMatrix = mat4.create();
    mat4.lookAt(cameraMatrix, cameraPos, viewPoint, upVec);
    mat4.rotateY(cameraMatrix, cameraMatrix, degToRad(rotY));
    // Make a view matrix from the camera matrix.
    mat4.invert(vMatrix, cameraMatrix);

    // the inverse of the view direction multiplied by the projection matrix, inverted
    var viewDirectionProjectionMatrix = mat4.create();
    mat4.multiply(viewDirectionProjectionMatrix, pMatrix, vMatrix);

    mat4.invert(viewDirectionProjectionMatrix, viewDirectionProjectionMatrix);

    // Set the uniforms
    gl.uniformMatrix4fv(
        cubeShaderProgram.cubeViewDirectionProjection, false,
        viewDirectionProjectionMatrix);

    // Tell the shader to use texture unit 0 for u_skybox
    gl.uniform1i(cubeShaderProgram.cubeTextureUniform, 0);

    // Draw the geometry.
    gl.bindBuffer(gl.ARRAY_BUFFER, skyboxPositionBuffer);
    gl.drawArrays(gl.TRIANGLES, 0, 1 * 6);

    drawTeapot();
    requestAnimationFrame(drawScene);
  }
}

// Fill the buffer with the values that define a quad.
function setGeometry(gl) {
  var positions = new Float32Array(
    [
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
}

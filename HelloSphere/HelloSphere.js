
var gl;
var canvas;
var shaderProgram;
var vertexPositionBuffer;

// Create a place to store sphere geometry
var sphereVertexPositionBuffer;

//Create a place to store normals for shading
var sphereVertexNormalBuffer;

// View parameters
var eyePt = vec3.fromValues(0.0,0.0,100.0);
var viewDir = vec3.fromValues(0.0,0.0,-1.0);
var up = vec3.fromValues(0.0,1.0,0.0);
var viewPt = vec3.fromValues(0.0,0.0,0.0);

// Create the normal
var nMatrix = mat3.create();

// Create ModelView matrix
var mvMatrix = mat4.create();

//Create Projection matrix
var pMatrix = mat4.create();

var sphereList = [];

var light_on = [1.0,1.0,1.0];
var light_off = [0.0,0.0,0.0];
var aLight;
var dLight;
var sLight;
var lightPos=[20,20,20];

var sphereRadius = 1

var shiny;
var diffuse;
var ambient;
var specular;

var boundingBoxValue = 20;

var energyLost; // amount of energy lost per collision. 0 means none, and 1 means all

var speedBoostAmount; // multiplier for the speed of all balls

//-----------------------------------------------------------------
//Color conversion  helper functions
function hexToR(h) {return parseInt((cutHex(h)).substring(0,2),16)}
function hexToG(h) {return parseInt((cutHex(h)).substring(2,4),16)}
function hexToB(h) {return parseInt((cutHex(h)).substring(4,6),16)}
function cutHex(h) {return (h.charAt(0)=="#") ? h.substring(1,7):h}


//-------------------------------------------------------------------------
/**
 * Populates buffers with data for spheres
 */
function setupsphereVertexPositionBuffers() {

    var sphereSoup=[];
    var sphereNormals=[];
    var numT=sphereFromSubdivision(6,sphereSoup,sphereNormals);
    console.log("Generated ", numT, " triangles");
    //console.log(sphereSoup);
    console.log("Generated ", sphereNormals.length/3, " normals");
    //console.log(sphereNormals);
    sphereVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereSoup), gl.STATIC_DRAW);
    sphereVertexPositionBuffer.itemSize = 3;
    sphereVertexPositionBuffer.numItems = numT*3;
    console.log(sphereSoup.length/9);

    // Specify normals to be able to do lighting calculations
    sphereVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereNormals),
                  gl.STATIC_DRAW);
    sphereVertexNormalBuffer.itemSize = 3;
    sphereVertexNormalBuffer.numItems = numT*3;

    console.log("Normals ", sphereNormals.length/3);
}

//-------------------------------------------------------------------------
/**
 * Draws a sphere from the sphere buffer
 */
function drawSpheres(){
  for (let i = 0; i < sphereList.length; i++) {
    sphereList[i].update()
    sphereList[i].draw()
  }
}

//-------------------------------------------------------------------------
/**
 * Sends projection matrix to shader
 */
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform,
                      false, pMatrix);
}

//----------------------------------------------------------------------------------
/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    uploadProjectionMatrixToShader();
}

//----------------------------------------------------------------------------------
/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
        return degrees * Math.PI / 180;
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

//----------------------------------------------------------------------------------
/**
 * Setup the fragment and vertex shaders
 */
function setupShaders(vshader,fshader) {
  vertexShader = loadShaderFromDOM(vshader);
  fragmentShader = loadShaderFromDOM(fshader);

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
  shaderProgram.uniformDiffuseMaterialColor = gl.getUniformLocation(shaderProgram, "uDiffuseMaterialColor");
  shaderProgram.uniformAmbientMaterialColor = gl.getUniformLocation(shaderProgram, "uAmbientMaterialColor");
  shaderProgram.uniformSpecularMaterialColor = gl.getUniformLocation(shaderProgram, "uSpecularMaterialColor");

  shaderProgram.uniformShininess = gl.getUniformLocation(shaderProgram, "uShininess");
}

//-------------------------------------------------------------------------
/**
 * Sends light information to the shader
 * @param {Float32Array} loc Location of light source
 * @param {Float32Array} a Ambient light strength
 * @param {Float32Array} d Diffuse light strength
 * @param {Float32Array} s Specular light strength
 */
function uploadLightsToShader(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

//----------------------------------------------------------------------------------
/**
 * Populate buffers with data
 */
function setupBuffers() {
    setupsphereVertexPositionBuffers();
}

//----------------------------------------------------------------------------------
/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function draw() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective
    mat4.perspective(pMatrix,degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);

    // We want to look down -z, so create a lookat point in that direction
    vec3.add(viewPt, eyePt, viewDir);
    // Then generate the lookat matrix and initialize the MV matrix to that view
    mat4.lookAt(mvMatrix,eyePt,viewPt,up);

    //Get material color
    colorVal = document.getElementById("mat-color").value
    R = hexToR(colorVal)/255.0;
    G = hexToG(colorVal)/255.0;
    B = hexToB(colorVal)/255.0;

    //Get shiny
    shiny = document.getElementById("shininess").value
    // Get light position
    lightPos[0] = document.getElementById("lx").value
    lightPos[1] = document.getElementById("ly").value
    lightPos[2] = document.getElementById("lz").value

    // Get a,d,s terms on/off status
    if (document.getElementById("ambient").checked)
        aLight = light_on;
    else
        aLight = light_off;

     if (document.getElementById("diffuse").checked)
        dLight = light_on;
    else
        dLight = light_off;

     if (document.getElementById("specular").checked)
        sLight = light_on;
    else
        sLight = light_off;

    var gravityEnable = document.getElementById("enableGravity").checked
    for (let i = 0; i < sphereList.length; i++) {
        if (gravityEnable)
            sphereList[i].accelY = -.02
        else
            sphereList[i].accelY = 0
    }

    energyLost = document.getElementById("energyLost").value
    if (energyLost < 0 || energyLost > 1) {
        energyLost = 0
        document.getElementById("energyLost").value = "NaN"
    }

    speedBoostAmount = document.getElementById("speedBoostSlider").value / 10

    diffuse = [R,G,B]
    ambient = [R,G,B]
    specular = [1.0,1.0,1.0]

    uploadLightsToShader(lightPos,aLight,dLight,sLight);
    setMatrixUniforms();
    drawSpheres();
}

function randSign() {
    if (Math.random() > .5) return 1
    return -1
}

function generateStartingVelocity() {
    return [randSign() * Math.random() / 10, randSign() * Math.random() / 10, randSign() * Math.random() / 10]
}

function generateRandomStartingPosition() {
    return [(randSign() * (Math.random() * (boundingBoxValue - sphereRadius))), (randSign() * (Math.random() * (boundingBoxValue - sphereRadius))), (randSign() * (Math.random() * (boundingBoxValue - sphereRadius)))]
}

function onClickCanvas() {
    // called when clicking on canvas
    sphereList.push(new Sphere(sphereRadius, generateRandomStartingPosition(), generateStartingVelocity(), diffuse, ambient, specular, shiny))
}

function resetSpheres() {
    sphereList = []
}

//----------------------------------------------------------------------------------
/**
 * Animation to be called from tick. Updates globals and performs animation for each tick.
 */
function setGouraudShader() {
    console.log("Setting Gouraud Shader");
    setupShaders("shader-gouraud-phong-vs","shader-gouraud-phong-fs");
}


//----------------------------------------------------------------------------------
/**
 * Startup function called from html code to start program.
 */
 function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShaders("shader-gouraud-phong-vs","shader-gouraud-phong-fs");
  setupBuffers();
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  tick();
}

//----------------------------------------------------------------------------------
/**
 * Tick called for every animation frame.
 */
function tick() {
    requestAnimFrame(tick);
    draw();
}






class Sphere {
    constructor(radius, position, velocity, dcolor, acolor, scolor, shiny) {
        this.posX = position[0]
        this.posY = position[1]
        this.posZ = position[2]
        this.velX = velocity[0]
        this.velY = velocity[1]
        this.velZ = velocity[2]
        this.accelX = 0
        this.accelY = 0
        this.accelZ = 0
        this.rotX = 0
        this.rotY = 0
        this.rotZ = 0
        this.dcolor = dcolor
        this.acolor = acolor
        this.scolor = scolor
        this.shiny = shiny
        this.sphereRadius = radius
        this.mvMatrix = mat4.create()
        this.nMatrix = mat3.create()
    }

    //-------------------------------------------------------------------------
    /**
     * Generates and sends the normal matrix to the shader
     */
    uploadNormalMatrixToShader() {
      mat3.fromMat4(this.nMatrix,this.mvMatrix);
      mat3.transpose(this.nMatrix,this.nMatrix);
      mat3.invert(this.nMatrix,this.nMatrix);
      gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, this.nMatrix);
    }

    // calculates reflected vector from normal
    reflect(d, n) {
        var ret_vec = vec3.create()

        var dotProd = 2 * vec3.dot(d, n)

        var scaled = vec3.create()
        vec3.scale(scaled, n, dotProd)

        vec3.subtract(ret_vec, d, scaled)
        return ret_vec
    }

    boundSphere() {
        let normal = null
        if(this.posX + (this.velX * speedBoostAmount) - this.sphereRadius < -boundingBoxValue) {
            // reflect the ball off the background with some angle of incidence
            normal = vec3.fromValues(1, 0, 0)
            console.log("Collided -x")

            // set it to be in bounds
            //this.posX = -1 + this.sphereRadius
        }
        else if(this.posX + (this.velX * speedBoostAmount) + this.sphereRadius > boundingBoxValue) {
            normal = vec3.fromValues(-1, 0, 0)
            console.log("Collided x")

            //this.posX = 1 - this.sphereRadius
        }
        else if(this.posY + (this.velY * speedBoostAmount) - this.sphereRadius < -boundingBoxValue) {
            normal = vec3.fromValues(0, 1, 0)
            console.log("Collided -y")

            //this.posY = -1 + this.sphereRadius
        }
        else if(this.posY + (this.velY * speedBoostAmount) + this.sphereRadius > boundingBoxValue) {
            normal = vec3.fromValues(0, -1, 0)
            console.log("Collided y")

            //this.posY = 1 - this.sphereRadius
        }
        else if(this.posZ + (this.velZ * speedBoostAmount) - this.sphereRadius < -boundingBoxValue) {
            normal = vec3.fromValues(0, 0, 1)
            console.log("Collided -z")

            //this.posZ = -1 + this.sphereRadius
        }
        else if(this.posZ + (this.velZ * speedBoostAmount) + this.sphereRadius > boundingBoxValue) {
            normal = vec3.fromValues(0, 0, -1)
            console.log("Collided z")

            //this.posZ = 1 - this.sphereRadius
        }
        if (normal !== null) {
            var reflected = this.reflect(vec3.fromValues(this.velX, this.velY, this.velZ), normal)
            this.velX = reflected[0] * (1 - energyLost) // calculate how much is conserved in collision
            this.velY = reflected[1] * (1 - energyLost)
            this.velZ = reflected[2] * (1 - energyLost)
        }
    }

    uploadMaterialToShader() {
      gl.uniform3fv(shaderProgram.uniformDiffuseMaterialColor, this.dcolor);
      gl.uniform3fv(shaderProgram.uniformAmbientMaterialColor, this.acolor);
      gl.uniform3fv(shaderProgram.uniformSpecularMaterialColor, this.scolor);

      gl.uniform1f(shaderProgram.uniformShininess, this.shiny);
    }

    update() {
        this.boundSphere()

        this.posX += (this.velX * speedBoostAmount)
        this.posY += (this.velY * speedBoostAmount)
        this.posZ += (this.velZ * speedBoostAmount)
        this.velX += this.accelX
        this.velY += this.accelY
        this.velZ += this.accelZ

        mat4.identity(this.mvMatrix)

        // scale and translate mv matrix
        var scaleMat = mat4.create()
        var scaleVec = vec3.fromValues(this.sphereRadius, this.sphereRadius, this.sphereRadius)
        mat4.fromScaling(scaleMat, scaleVec)

        // mat4.scale(this.mvMatrix, this.mvMatrix, scaleVec)

        var translateMat = mat4.create()
        var translateVec = vec3.fromValues(this.posX, this.posY, this.posZ)
        mat4.fromTranslation(translateMat, translateVec)

        // mat4.translate(this.mvMatrix, this.mvMatrix, translateMat)
        mat4.multiply(this.mvMatrix, translateMat, this.mvMatrix)

        mat4.multiply(this.mvMatrix, scaleMat, this.mvMatrix)
        mat4.multiply(this.mvMatrix, mvMatrix, this.mvMatrix)
    }

    sendUniformsAndAttribs() {
        gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, this.mvMatrix)
    }

    draw() {
        gl.useProgram(shaderProgram)

        // send sphere specific uniforms
        this.sendUniformsAndAttribs()
        this.uploadNormalMatrixToShader()
        this.uploadMaterialToShader()
        // Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
        var size = 3;          // 2 components per iteration
        var type = gl.FLOAT;   // the data is 32bit floats
        var normalize = false; // don't normalize the data
        var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
        var offset = 0;        // start at the beginning of the buffer

        gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer)
        gl.vertexAttribPointer(
            shaderProgram.vertexPositionAttribute, size, type, normalize, stride, offset);

        gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer)
        gl.vertexAttribPointer(
            shaderProgram.vertexNormalAttribute, size, type, normalize, stride, offset
        )
        // actually draw it

        gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer)
        gl.drawArrays(gl.TRIANGLES, 0, sphereVertexPositionBuffer.numItems) // tell it how many triangles for sphere
    }
}

var sphereBuffer = null;
var sphereData = []
var sphereNormalsData = []
var sphereNormalsBuffer = null
var subdivs = 5

//Light parameters
/** @global Light position in VIEW coordinates */
var lightPosition = [1,1,-3];
/** @global Ambient light color/intensity for Phong reflection */
var lAmbient = [.5,1,1];
/** @global Diffuse light color/intensity for Phong reflection */
var lDiffuse = [.5,.5,.5];
/** @global Specular light color/intensity for Phong reflection */
var lSpecular =[1,1,1];

//Material parameters
/** @global Ambient material color/intensity for Phong reflection */
var kAmbient = [.25,.25,.25];
/** @global Diffuse material color/intensity for Phong reflection */
var kTerrainDiffuse = [192/255,192/255,192/255];
/** @global Specular material color/intensity for Phong reflection */
var kSpecular = [1,1,1];
/** @global Shininess exponent for Phong reflection */
var shininess = 120;

function pushVertex(v, vArray)
{
 for(i=0;i<3;i++)
 {
     vArray.push(v[i]);
 }
}

function createSphere() {
    sphereFromSubdivision(subdivs, sphereData, sphereNormalsData)
    setupBuffers()
    console.log(sphereData.length)
    console.log(sphereNormalsData.length)
}

function setupBuffers() {
    // fill buffer with sphere vertex data
    sphereBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereData), gl.DYNAMIC_DRAW)
    sphereNormalsBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereNormalsBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereNormalsData), gl.STATIC_DRAW)
    // buffer now has vertex data

    // enable positions buffer
    gl.enableVertexAttribArray(spheresProgram.vertexPositionAttribute)
    gl.enableVertexAttribArray(spheresProgram.vertexNormalAttribute)

}

//-----------------------------------------------------------
function sphDivideTriangle(a,b,c,numSubDivs, vertexArray,normalArray)
{
  if (numSubDivs>0)
  {
      var numT=0;
      var ab =  vec4.create();
      vec4.lerp(ab,a,b,0.5);
      vec4.normalize(ab,ab);
      var ac =  vec4.create();
      vec4.lerp(ac,a,c,0.5);
      vec4.normalize(ac,ac);
      var bc =  vec4.create();
      vec4.lerp(bc,b,c,0.5);
      vec4.normalize(bc,bc);
      numT+=sphDivideTriangle(a,ab,ac,numSubDivs-1, vertexArray,normalArray);
      numT+=sphDivideTriangle(ab,b,bc,numSubDivs-1, vertexArray,normalArray);
      numT+=sphDivideTriangle(bc,c,ac,numSubDivs-1, vertexArray, normalArray);
      numT+=sphDivideTriangle(ab,bc,ac,numSubDivs-1, vertexArray, normalArray);
      return numT;
  }
  else
  {
      // Add 3 vertices to the array

      pushVertex(a,vertexArray);
      pushVertex(b,vertexArray);
      pushVertex(c,vertexArray);

      pushVertex(a,normalArray);
      pushVertex(b,normalArray);
      pushVertex(c,normalArray);

      return 1;

  }
}

//-------------------------------------------------------------------------
function sphereFromSubdivision(numSubDivs, vertexArray, normalArray)
{
    var numT=0;
    var a = vec4.fromValues(0.0,0.0,-1.0,0);
    var b = vec4.fromValues(0.0,0.942809,0.333333,0);
    var c = vec4.fromValues(-0.816497,-0.471405,0.333333,0);
    var d = vec4.fromValues(0.816497,-0.471405,0.333333,0);

    numT+=sphDivideTriangle(a,b,c,numSubDivs, vertexArray, normalArray);
    numT+=sphDivideTriangle(d,c,b,numSubDivs, vertexArray, normalArray);
    numT+=sphDivideTriangle(a,d,b,numSubDivs, vertexArray, normalArray);
    numT+=sphDivideTriangle(a,c,d,numSubDivs, vertexArray, normalArray);
    return numT;
}
class Sphere {
    constructor(radius, position, velocity) {
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
        this.sphereRadius = radius
        this.color = [1.0, 0.0, 0.0, 1.0] // four channel RGBA 1.0 is max
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
      gl.uniformMatrix3fv(spheresProgram.nMatrixUniform, false, this.nMatrix);
    }


//-------------------------------------------------------------------------
/**
 * Sends material information to the shader
 * @param {Float32Array} a diffuse material color
 * @param {Float32Array} a ambient material color
 * @param {Float32Array} a specular material color
 * @param {Float32} the shininess exponent for Phong illumination
 */
    uploadMaterialToShader(dcolor, acolor, scolor,shiny) {
        gl.uniform3fv(spheresProgram.uniformDiffuseMaterialColor, dcolor);
        gl.uniform3fv(spheresProgram.uniformAmbientMaterialColor, acolor);
        gl.uniform3fv(spheresProgram.uniformSpecularMaterialColor, scolor);
        gl.uniform1f(spheresProgram.uniformShininess, shiny);
    }

//-------------------------------------------------------------------------
/**
 * Sends light information to the shader
 * @param {Float32Array} loc Location of light source
 * @param {Float32Array} a Ambient light strength
 * @param {Float32Array} d Diffuse light strength
 * @param {Float32Array} s Specular light strength
 */
    uploadLightsToShader(loc,a,d,s) {
        gl.uniform3fv(spheresProgram.uniformLightPositionLoc, loc);
        gl.uniform3fv(spheresProgram.uniformAmbientLightColorLoc, a);
        gl.uniform3fv(spheresProgram.uniformDiffuseLightColorLoc, d);
        gl.uniform3fv(spheresProgram.uniformSpecularLightColorLoc, s);
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
      return
      console.log(this.posX, this.posY, this.posZ)
        let normal = null
        if(this.posX + this.velX - this.sphereRadius < -1) {
            // reflect the ball off the background with some angle of incidence
            normal = vec3.fromValues(1, 0, 0)
            // set it to be in bounds
            //this.posX = -1 + this.sphereRadius
        }
        else if(this.posX + this.velX + this.sphereRadius > 1) {
            normal = vec3.fromValues(-1, 0, 0)
            //this.posX = 1 - this.sphereRadius
        }
        else if(this.posY + this.velY - this.sphereRadius < -1) {
            normal = vec3.fromValues(0, 1, 0)
            //this.posY = -1 + this.sphereRadius
        }
        else if(this.posY + this.velY + this.sphereRadius > 1) {
            normal = vec3.fromValues(0, -1, 0)
            //this.posY = 1 - this.sphereRadius
        }
        else if(this.posZ + this.velZ - this.sphereRadius < -1) {
            normal = vec3.fromValues(0, 0, 1)
            //this.posZ = -1 + this.sphereRadius
        }
        else if(this.posZ + this.velZ + this.sphereRadius > 1) {
            normal = vec3.fromValues(0, 0, -1)
            //this.posZ = 1 - this.sphereRadius
        }
        if (normal !== null) {
            console.log("Bounced")
            var reflected = this.reflect(vec3.fromValues(this.velX, this.velY, this.velZ), normal)
            console.log(reflected)
            this.velX = reflected[0]
            this.velY = reflected[1]
            this.velZ = reflected[2]
        }
    }

    update() {
        this.boundSphere()

        this.posX += this.velX
        this.posY += this.velY
        this.posZ += this.velZ
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
        mat4.multiply(this.mvMatrix, vMatrix, this.mvMatrix)



        // have matrix match up with global view matrix
        //this.mvMatrix = vMatrix
    }

    sendUniformsAndAttribs() {
        gl.uniformMatrix4fv(spheresProgram.mvMatrixUniform, false, this.mvMatrix)
        gl.uniform4fv(spheresProgram.sphereColorUniform, this.color)

}

    draw() {
        gl.useProgram(spheresProgram)

        // send sphere specific uniforms
        this.sendUniformsAndAttribs()
        this.uploadNormalMatrixToShader()

        // update lighting
        this.uploadLightsToShader(lightPosition,lAmbient,lDiffuse, lSpecular);
        this.uploadMaterialToShader(kAmbient,kTerrainDiffuse,kSpecular,shininess);

        // Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
        var size = 3;          // 2 components per iteration
        var type = gl.FLOAT;   // the data is 32bit floats
        var normalize = false; // don't normalize the data
        var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
        var offset = 0;        // start at the beginning of the buffer

        gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer)
        gl.vertexAttribPointer(
            spheresProgram.vertexPositionAttribute, size, type, normalize, stride, offset);

        gl.bindBuffer(gl.ARRAY_BUFFER, sphereNormalsBuffer)
        gl.vertexAttribPointer(
            spheresProgram.vertexNormalAttribute, size, type, normalize, stride, offset
        )
        // actually draw it

        gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer)
        gl.drawArrays(gl.TRIANGLES, 0, sphereData.length / 3) // tell it how many triangles for sphere
    }
}


function concat(arr, concatArr) {
    for (let i = 0; i < concatArr.length; i++) {
        arr.push(concatArr[i])
    }
}

class Sphere {
    constructor(gl, radius, position, velocity) {
        this.posX = position[0]
        this.posY = position[1]
        this.posZ = position[2]
        this.velX = velocity[0]
        this.velY = velocity[1]
        this.velZ = velocity[2]
        this.accelX = 0
        this.accelY = 0
        this.accelZ = 0
        this.gl = gl // used for sphere draw method
        this.sphereRadius = radius
        this.resolution = .05 // when distance between verticies in the triangles hits this distance, stop recursing
        this.color = [1.0, 1.0, 1.0, 1.0] // four channel RGBA 1.0 is max
        this.sphereData = [] // 1d array of vertexes needed to draw sphere
        generateSphereVerts()
        setupBuffers()
    }

    addTriangle(vert1, vert2, vert3) {
        concat(this.sphereData, vert1)
        concat(this.sphereData, vert2)
        concat(this.sphereData, vert3)
    }

    subdivideTriangle(vert1, vert2, vert3) {
        if (vec3.dist(vert1, vert2) <= this.resolution) {
            // hit base case. Normalize, and add to buffer then return
            normalize(vert1, vert2, vert3)
            this.addTriangle(vert1, vert2, vert3)
            return
        }
        // divide triangle into 4 equal triangles by lerping
        midpoint1 = vec3.create()
        midpoint2 = vec3.create()
        midpoint3 = vec3.create()

        // find the midpoints of the lines
        lerp(midpoint1, vert1, vert2, .5)
        lerp(midpoint2, vert1, vert3, .5)
        lerp(midpoint3, vert2, vert3, .5)

        // use those to construct 4 triangles
        this.subdivideTriangle(vert1, midpoint1, midpoint3)
        this.subdivideTriangle(midpoint3, midpoint2, vert3)
        this.subdivideTriangle(midpoint1, vert2, midpoint2)
        this.subdivideTriangle(midpoint1, midpoint2, midpoint3)
    }

    generateSphereVerts() {
      // first create a quad
      // 1d buffer of vertexes with every 3 vertexes being a face

      // hardcoded math to calculate distance each point should be 1 away from center
      let vertex1 = vec3.fromValues(0, 1, 0)
      let vertex2 = vec3.fromValues(-sqrt(3) /3, -sqrt(3) / 3, -sqrt(3) / 3)
      let vertex3 = vec3.fromValues(sqrt(3) / 3, -sqrt(3) / 3, -sqrt(3) / 3)
      let vertex4 = vec3.fromValues(0, -sqrt(2) / 2, sqrt(2) / 2)

      // make recursive subdivide calls
      this.subdivideTriangle(vertex1, vertex2, vertex3)
      this.subdivideTriangle(vertex1, vertex3, vertex4)
      this.subdivideTriangle(vertex1, vertex2, vertex4)
      this.subdivideTriangle(vertex2, vertex3, vertex4)
    }
    update() {
        this.velX += accelX
        this.velY += accelY
        this.velZ += accelZ
        this.posX += velX
        this.posY += velY
        this.posZ += velZ
    }

    setupBuffers() {
        // fill buffer with sphere vertex data
        this.sphereBuffer = this.gl.createBuffer()
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.sphereBuffer)
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.sphereData), this.gl.DYNAMIC_DRAW)
        // buffer now has vertex data
    }

    draw() {

    }
}

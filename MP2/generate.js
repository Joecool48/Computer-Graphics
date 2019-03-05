/**
 * @fileoverview Terrain - A simple 3D terrain using WebGL
 * @author Eric Shaffer
 */

function max(a, b, c, d) {
    var m = a;
    if (b > m) m = b;
    if (c > m) m = c;
    if (d > m) m = d;
    return m;
}

function min(a, b, c, d) {
    var m = a;
    if (b < m) m = b;
    if (c < m) m = c;
    if (d < m) m = d;
    return m;
}


/** Class implementing 3D terrain. */
class Terrain{
/**
 * Initialize members of a Terrain object
 * @param {number} div Number of triangles along x axis and y axis
 * @param {number} minX Minimum X coordinate value
 * @param {number} maxX Maximum X coordinate value
 * @param {number} minY Minimum Y coordinate value
 * @param {number} maxY Maximum Y coordinate value
 */
    constructor(div,minX,maxX,minY,maxY){
        this.div = div;
        this.minX=minX;
        this.minY=minY;
        this.maxX=maxX;
        this.maxY=maxY;

        // Allocate vertex array
        this.vBuffer = [];
        // Allocate triangle array
        this.fBuffer = [];
        // Allocate normal array
        this.nBuffer = [];
        // Allocate array for edges so we can draw wireframe
        this.eBuffer = [];
        console.log("Terrain: Allocated buffers");

        this.generateTriangles();
        console.log("Terrain: Generated triangles");

        this.generateLines();
        console.log("Terrain: Generated lines");

        // Get extension for 4 byte integer indices for drwElements
        var ext = gl.getExtension('OES_element_index_uint');
        if (ext ==null){
            alert("OES_element_index_uint is unsupported by your browser and terrain generation cannot proceed.");
        }
    }

    /**
    * Set the x,y,z coords of a vertex at location(i,j)
    * @param {Object} v an an array of length 3 holding x,y,z coordinates
    * @param {number} i the ith row of vertices
    * @param {number} j the jth column of vertices
    */
    setVertex(v,i,j)
    {
        //Your code here
        var vid = 3 * (i * (this.div + 1) + j);
        this.vBuffer[vid] = v[0]
        this.vBuffer[vid + 1] = v[1];
        this.vBuffer[vid + 2] = v[2];
    }


    /**
    * Return the x,y,z coordinates of a vertex at location (i,j)
    * @param {Object} v an an array of length 3 holding x,y,z coordinates
    * @param {number} i the ith row of vertices
    * @param {number} j the jth column of vertices
    */
    getVertex(v,i,j)
    {
        //Your code here
        var vid = 3 * (i * (this.div + 1) + j);
        v[0] = this.vBuffer[vid];
        v[1] = this.vBuffer[vid + 1];
        v[2] = this.vBuffer[vid + 2];
    }
    /**
    * Compute the surface normals for the vBuffer of vectors. Goes through
    * sets of 3 vertexes and computes the cross product for them. Then assigns
    * each normal in the nBuffer to that value
    */
    updateVertexNormals() {
        var idx = 0;
        var vec3_cross_product = vec3.create();
        var first = vec3.create();
        var second = vec3.create();
        var third = vec3.create();
        var sub1 = vec3.create();
        var sub2 = vec3.create();
        var normalized = vec3.create();

        while (idx < this.vBuffer.length) {
            // Index through the buffer and find the vertexes needed for the algorithm
            vec3.fromValues(first, this.vBuffer[idx], this.vBuffer[idx + 1], this.vBuffer[idx + 2]);
            vec3.fromValues(second, this.vBuffer[idx + 3], this.vBuffer[idx + 4], this.vBuffer[idx + 5]);
            vec3.fromValues(third, this.vBuffer[idx + 6], this.vBuffer[idx + 7], this.vBuffer[idx + 8]);
            // Get the 2 vectors for cross product
            vec3.subtract(sub1, second, first);
            vec3.subtract(sub2, third, first);

            // Compute the normal vector
            vec3.cross(vec3_cross_product, sub1, sub2);
            vec3.normalize(normalized, vec3_cross_product);

            // Insert it at the 3 locations in the nBuffer
            this.nBuffer[idx] = normalized[0];
            this.nBuffer[idx + 1] += normalized[1];
            this.nBuffer[idx + 2] += normalized[2];
            this.nBuffer[idx + 3] += normalized[0];
            this.nBuffer[idx + 4] += normalized[1];
            this.nBuffer[idx + 5] += normalized[2];
            this.nBuffer[idx + 6] += normalized[0];
            this.nBuffer[idx + 8] += normalized[2];
            this.nBuffer[idx + 7] += normalized[1];

            idx = idx + 9;
        }
    }

    /**
    * Send the buffer objects to WebGL for rendering
    */
    loadBuffers()
    {
        // Specify the vertex coordinates
        this.VertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vBuffer), gl.STATIC_DRAW);
        this.VertexPositionBuffer.itemSize = 3;
        this.VertexPositionBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.VertexPositionBuffer.numItems, " vertices");

        // Specify normals to be able to do lighting calculations
        this.VertexNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.nBuffer),
                  gl.STATIC_DRAW);
        this.VertexNormalBuffer.itemSize = 3;
        this.VertexNormalBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.VertexNormalBuffer.numItems, " normals");

        // Specify faces of the terrain
        this.IndexTriBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexTriBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.fBuffer),
                  gl.STATIC_DRAW);
        this.IndexTriBuffer.itemSize = 1;
        this.IndexTriBuffer.numItems = this.fBuffer.length;
        console.log("Loaded ", this.IndexTriBuffer.numItems, " triangles");

        //Setup Edges
        this.IndexEdgeBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexEdgeBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.eBuffer),
                  gl.STATIC_DRAW);
        this.IndexEdgeBuffer.itemSize = 1;
        this.IndexEdgeBuffer.numItems = this.eBuffer.length;

        console.log("triangulatedPlane: loadBuffers");
    }

    /**
    * Render the triangles
    */
    drawTriangles(){
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.VertexPositionBuffer.itemSize,
                         gl.FLOAT, false, 0, 0);

        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute,
                           this.VertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);

        //Draw
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexTriBuffer);
        gl.drawElements(gl.TRIANGLES, this.IndexTriBuffer.numItems, gl.UNSIGNED_INT,0);
    }

    /**
    * Render the triangle edges wireframe style
    */
    drawEdges(){

        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.VertexPositionBuffer.itemSize,
                         gl.FLOAT, false, 0, 0);

        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute,
                           this.VertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);

        //Draw
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexEdgeBuffer);
        gl.drawElements(gl.LINES, this.IndexEdgeBuffer.numItems, gl.UNSIGNED_INT,0);
    }

    /** Returns a random number based on the bias value given
    * @param {Number} bias -- a number that tweaks how large the random number returned is
    * @return {Number} A random number for use in terrain generation noise
    */
    getRandom(bias) {
        var rand = (.6 - Math.random()) * bias;
        if(Math.random() > .6) rand *= -1;
        return rand;
    }

    /** Returns true if the point given is within bounds and false otherwise
    * @param {List} pt -- a 2D array containing the x and y coordinates of the point
    * @return {Boolean} true if it is within boundsd and false otherwise
    */
    in_bounds(pt) {
        return pt[0] >= 0 && pt[0] < this.div && pt[1] < this.div && pt[1] >= 0;
    }

    /** A function that computes the value from a square at the given point.
    * It computes the average of all the elements nearby, and adds a random seed value.
    * It then sets that point to the new value just generated
    * @param {List} pt -- the point to set the height of based on its neighbors [x, y]
    * @param {Number} step_size -- how far to travel up, down, left, and right
    * @param {Number} rand -- the random value to add to the average
    */
    do_square(pt, step_size, rand) {
        // first find all the nodes step size away horizontally and vertically
        if (!this.in_bounds(pt)) return;
        var total = 0;
        var count = 0;
        var ret_pt = [];
        var check_pt = [pt[0] + step_size, pt[1]];
        // check the right
        if (this.in_bounds(check_pt)) {
            this.getVertex(ret_pt, check_pt[1], check_pt[0]);
            total += ret_pt[2]; // add the z value to the total
            count += 1;
        }
        // check the left
        check_pt = [pt[0] - step_size, pt[1]];
        if (this.in_bounds(check_pt)) {
            this.getVertex(ret_pt, check_pt[1], check_pt[0]);
            total += ret_pt[2];
            count += 1;
        }
        // check the bot
        check_pt = [pt[0], pt[1] + step_size];
        if (this.in_bounds(check_pt)) {
            this.getVertex(ret_pt, check_pt[1], check_pt[0]);
            total += ret_pt[2];
            count += 1;
        }
        // check the top
        check_pt = [pt[0], pt[1] - step_size];
        if (this.in_bounds(check_pt)) {
            this.getVertex(ret_pt, check_pt[1], check_pt[0]);
            total += ret_pt[2];
            count += 1;
        }
        // If no values present within range, then do nothing
        if (count != 0) {
            var new_pt_val = [];
            this.getVertex(new_pt_val, pt[1], pt[0]);
            var new_height = (total / count) + rand;
            this.setVertex([new_pt_val[0], new_pt_val[1], new_height], pt[1], pt[0]);
        }

    }
    /** A function that computes the value from a diamond at the given point.
    * It computes the average of all the elements nearby, and adds a random seed value.
    * It then sets that point to the new value just generated
    * @param {List} pt -- the point to set the height of based on its neighbors [x, y]
    * @param {Number} step_size -- how far to travel up, down, left, and right
    * @param {Number} rand -- the random value to add to the average
    */
    do_diamond(pt, step_size, rand) {
        if (!this.in_bounds(pt)) return;
        var total = 0;
        var count = 0;
        var ret_pt = [];
        // check the bottom right
        var check_pt = [pt[0] + step_size, pt[1] + step_size];
        if (this.in_bounds(check_pt)) {
            this.getVertex(ret_pt, check_pt[1], check_pt[0]);
            total += ret_pt[2]; // add the z value to the total
            count += 1;
        }
        // check the top left
        check_pt = [pt[0] - step_size, pt[1] - step_size];
        if (this.in_bounds(check_pt)) {
            this.getVertex(ret_pt, check_pt[1], check_pt[0]);
            total += ret_pt[2];
            count += 1;
        }
        // check the bottom left
        check_pt = [pt[0] - step_size, pt[1] + step_size];
        if (this.in_bounds(check_pt)) {
            this.getVertex(ret_pt, check_pt[1], check_pt[0]);
            total += ret_pt[2];
            count += 1;
        }
        // check the top right
        check_pt = [pt[0] + step_size, pt[1] - step_size];
        if (this.in_bounds(check_pt)) {
            this.getVertex(ret_pt, check_pt[1], check_pt[0]);
            total += ret_pt[2];
            count += 1;
        }
        // If no points within range do nothing, otherwise calculate the total based on the current position and random value
        if (count != 0) {
            var new_pt_val = [];
            this.getVertex(new_pt_val, pt[1], pt[0]);
            var new_height = (total / count) + rand;
            this.setVertex([new_pt_val[0], new_pt_val[1], new_height], pt[1], pt[0]);
        }
    }
    /**
    * A function that iterates through the step sizes and does the diamond and square steps.
    * Each time the size and roughness are reduced by a factor of 2. This causes the function
    * to spread out and rapidly change the values of all the square and diamond shapes that are made
    * @param {Number} size -- the size of the step to take initially
    * @param {Number} roughness -- the seed for the random number generation
    */
    subdivide(size, roughness) {
        var half = size;
        while (half >= 1) {
            // continuously subdivide in half
            half = size / 2;
            // loop through all diamonds
            for (var y = half; y < this.div; y += size) {
                for (var x = half; x < this.div; x += size) {
                    this.do_diamond([x,y], half, this.getRandom(roughness));
                }
            }
            // loop through all the squares
            for (var y = 0; y <= this.div; y += half) {
                for (var x = (y + half) % size; x <= this.div; x += size) {
                    this.do_square([x,y], half, this.getRandom(roughness));
                }
            }
            // reduce the step size and total roughness
            size /= 2;
            roughness /= 2;
        }
    }
    /**
    * A function to actually do the diamond square terrain generation algorithm.
    * This function first seeds the edges, then calls subdivide to take care of the rest of the squares and diamonds
    */
    diamondSquare() {
        // Set the starting vertices

        // set the bias
        var roughness = .5
        var v = [];
        // Set the corners to an original value
        this.getVertex(v, 0, 0);
        this.setVertex([v[0], v[1], this.getRandom(roughness)], 0, 0);
        this.getVertex(v, (this.div), (this.div));
        this.setVertex([v[0], v[1], this.getRandom(roughness)], (this.div), (this.div));
        this.getVertex(v, (this.div), 0);
        this.setVertex([v[0], v[1], this.getRandom(roughness)], (this.div), 0);
        this.getVertex(v, 0, (this.div));
        this.setVertex([v[0], v[1], this.getRandom(roughness)], 0, (this.div));

        roughness = .4;
        // Call the subdivide algorithm to finish it up
        this.subdivide(this.div - 1, roughness);
    }



/**
 * Fill the vertex and buffer arrays
 */
generateTriangles()
{
    //Your code here
    var deltaX = (this.maxX - this.minX) / this.div;
    var deltaY = (this.maxY - this.minY) / this.div;

    for (var i = 0; i <= this.div; i++) {
        for (var j = 0; j <= this.div; j++) {
            // Fill the vertexes by interpolating across
            this.vBuffer.push(this.minX + deltaX * j);
            this.vBuffer.push(this.minY + deltaY * i);
            this.vBuffer.push(0); // set the z value to 0 initially for diamond-square
            // terrain is flat so normal starts with 0 in x and y
            this.nBuffer.push(0);
            this.nBuffer.push(0);
            this.nBuffer.push(1);
        }
    }

    for (var i = 0; i < this.div; i++) {
        for (var j = 0; j < this.div; j++) {
            var vid = i * (this.div + 1) + j;
            // fill in the faces
            this.fBuffer.push(vid);
            this.fBuffer.push(vid + 1);
            this.fBuffer.push(vid + this.div + 1);

            this.fBuffer.push(vid + 1);
            this.fBuffer.push(vid + 1 + this.div + 1);
            this.fBuffer.push(vid + this.div + 1);
        }
    }
    this.numVertices = this.vBuffer.length/3;
    this.numFaces = this.fBuffer.length/3;
    // Do the algorithm and then update the normals based on how the diamond square algorithm worked
    this.diamondSquare();
    this.updateVertexNormals();
}

/**
 * Print vertices and triangles to console for debugging
 */
printBuffers()
    {

    for(var i=0;i<this.numVertices;i++)
          {
           console.log("v ", this.vBuffer[i*3], " ",
                             this.vBuffer[i*3 + 1], " ",
                             this.vBuffer[i*3 + 2], " ");

          }

      for(var i=0;i<this.numFaces;i++)
          {
           console.log("f ", this.fBuffer[i*3], " ",
                             this.fBuffer[i*3 + 1], " ",
                             this.fBuffer[i*3 + 2], " ");

          }

    }

/**
 * Generates line values from faces in faceArray
 * to enable wireframe rendering
 */
generateLines()
{
    var numTris=this.fBuffer.length/3;
    for(var f=0;f<numTris;f++)
    {
        var fid=f*3;
        this.eBuffer.push(this.fBuffer[fid]);
        this.eBuffer.push(this.fBuffer[fid+1]);

        this.eBuffer.push(this.fBuffer[fid+1]);
        this.eBuffer.push(this.fBuffer[fid+2]);

        this.eBuffer.push(this.fBuffer[fid+2]);
        this.eBuffer.push(this.fBuffer[fid]);
    }

}
}

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

    getRandom(bias) {
        var rand = Math.random() * bias;
        if(Math.random() > .5) rand *= -1;
        return rand;
    }

    // checks to make sure a point is in bounds and returns true if it is
    in_bounds(pt) {
        return pt[0] >= 0 && pt[0] < this.div && pt[1] < this.div && pt[1] >= 0;
    }

    // function to find the square corners by step size, average them, and set pt to that average plus a random bias
    do_square(pt, step_size, bias) {
        // first find all the nodes step size away horizontally and vertically
        if (!this.in_bounds(pt)) console.log("Why would you give me this?");
        var total = 0;
        var count = 0;
        var ret_pt = [];
        var check_pt = [pt[0] + step_size, pt[1]];
        if (this.in_bounds(check_pt)) {
            this.getVertex(ret_pt, check_pt[1], check_pt[0]);
            total += ret_pt[2]; // add the z value to the total
            count += 1;
        }
        check_pt = [pt[0] - step_size, pt[1]];
        if (this.in_bounds(check_pt)) {
            this.getVertex(ret_pt, check_pt[1], check_pt[0]);
            total += ret_pt[2];
            count += 1;
        }
        check_pt = [pt[0], pt[1] + step_size];
        if (this.in_bounds(check_pt)) {
            this.getVertex(ret_pt, check_pt[1], check_pt[0]);
            total += ret_pt[2];
            count += 1;
        }
        check_pt = [pt[0], pt[1] - step_size];
        if (this.in_bounds(check_pt)) {
            this.getVertex(ret_pt, check_pt[1], check_pt[0]);
            total += ret_pt[2];
            count += 1;
        }

        if (count != 0) {
            var new_pt_val = [];
            this.getVertex(new_pt_val, pt[1], pt[0]);
            var new_height = (total / count) + (Math.random() * bias);
            this.setVertex([new_pt_val[0], new_pt_val[1], new_height], pt[1], pt[0]);
        }

    }
    // function to get values at diamond angles, average them, and then assign point a random bias
    do_diamond(pt, step_size, bias) {
        if (!this.in_bounds(pt)) console.log("Why would you give me this?");
        var total = 0;
        var count = 0;
        var ret_pt = [];
        var check_pt = [pt[0] + step_size, pt[1] + step_size];
        if (this.in_bounds(check_pt)) {
            this.getVertex(ret_pt, check_pt[1], check_pt[0]);
            total += ret_pt[2]; // add the z value to the total
            count += 1;
        }
        check_pt = [pt[0] - step_size, pt[1] - step_size];
        if (this.in_bounds(check_pt)) {
            this.getVertex(ret_pt, check_pt[1], check_pt[0]);
            total += ret_pt[2];
            count += 1;
        }
        check_pt = [pt[0] - step_size, pt[1] + step_size];
        if (this.in_bounds(check_pt)) {
            this.getVertex(ret_pt, check_pt[1], check_pt[0]);
            total += ret_pt[2];
            count += 1;
        }
        check_pt = [pt[0] + step_size, pt[1] - step_size];
        if (this.in_bounds(check_pt)) {
            this.getVertex(ret_pt, check_pt[1], check_pt[0]);
            total += ret_pt[2];
            count += 1;
        }

        if (count != 0) {
            var new_pt_val = [];
            this.getVertex(new_pt_val, pt[1], pt[0]);
            var new_height = (total / count) + (Math.random() * bias);
            this.setVertex([new_pt_val[0], new_pt_val[1], new_height], pt[1], pt[0]);
        }
    }

    diamondSquare() {
        // Set the starting vertices

        // set the bias
        var bias = 1;
        var v = [];
        this.getVertex(v, 0, 0);
        this.setVertex([v[0], v[1], this.getRandom(bias)], 0, 0);
        this.getVertex(v, (this.div), (this.div));
        this.setVertex([v[0], v[1], this.getRandom(bias)], (this.div), (this.div));
        this.getVertex(v, (this.div), 0);
        this.setVertex([v[0], v[1], this.getRandom(bias)], (this.div), 0);
        this.getVertex(v, 0, (this.div));
        this.setVertex([v[0], v[1], this.getRandom(bias)], 0, (this.div));
        var setCount = 0;
        var p1 = [0, 0];
        var p2 = [this.div, 0];
        var p3 = [0, this.div];
        var p4 = [this.div, this.div];

        bias = .5;

        var explored_set = new Set();
        explored_set.add(p1);
        explored_set.add(p2);
        explored_set.add(p3);
        explored_set.add(p4);

        prev_added_points = [p1, p2, p3, p4];

        var diamond_step = true;

        var step_size = (this.div - 1) / 2;
        // for every diamond step, take steps in every diagnal direction, and
        // try to compute the midpoint there

        while (prev_added_points.length > 0 && step_size > 0) {
            if (diamond_step) {
                // go through all the old points, and check them all for new diamond values to add
                var len = prev_added_points.length;
                for (var i = 0; i < len; i++) {
                    var curr_pt = prev_added_points.pop();
                    var new_pt = [curr_pt[0] + step_size, curr_pt[1] + step_size];
                    if (this.in_bounds(new_pt) && !explored_set.has(new_pt)) {
                        this.do_diamond(new_pt, step_size, bias);
                        explored_set.add(new_pt);
                        prev_added_points.push(new_pt);
                    }
                    new_pt = [curr_pt[0] + step_size, curr_pt[1] - step_size];
                    if (this.in_bounds(new_pt) && !explored_set.has(new_pt)) {
                        this.do_diamond(new_pt, step_size, bias);
                        explored_set.add(new_pt);
                        prev_added_points.push(new_pt);
                    }
                    new_pt = [curr_pt[0] - step_size, curr_pt[1] + step_size];
                    if (this.in_bounds(new_pt) && !explored_set.has(new_pt)) {
                        this.do_diamond(new_pt, step_size, bias);
                        explored_set.add(new_pt);
                        prev_added_points.push(new_pt);
                    }
                    new_pt = [curr_pt[0] - step_size, curr_pt[1] - step_size];
                    if (this.in_bounds(new_pt) && !explored_set.has(new_pt)) {
                        this.do_diamond(new_pt, step_size, bias);
                        explored_set.add(new_pt);
                        prev_added_points.push(new_pt);
                    }
                }
                diamond_step = ~diamond_step;
            }
            /* otherwise it is a square step */
            else {
                var len = prev_added_points.length;
                for (var i = 0; i < len; i++) {
                    var curr_pt = prev_added_points.pop();
                    var new_pt = [curr_pt[0] + step_size, curr_pt[1]];
                    if (in_bounds(new_pt) && !explored_set.has(new_pt)) {
                        do_square(new_pt, step_size, bias);
                        explored_set.add(new_pt);
                        prev_added_points.push(new_pt);
                    }
                    new_pt = [curr_pt[0] - step_size, curr_pt[1]];
                    if (in_bounds(new_pt) && !explored_set.has(new_pt)) {
                        do_square(new_pt, step_size, bias);
                        explored_set.add(new_pt);
                        prev_added_points.push(new_pt);
                    }
                    new_pt = [curr_pt[0], curr_pt[1] + step_size];
                    if (in_bounds(new_pt) && !explored_set.has(new_pt)) {
                        do_square(new_pt, step_size, bias);
                        explored_set.add(new_pt);
                        prev_added_points.push(new_pt);
                    }
                    new_pt = [curr_pt[0], curr_pt[1] - step_size];
                    if (in_bounds(new_pt) && !explored_set.has(new_pt)) {
                        do_square(new_pt, step_size, bias);
                        explored_set.add(new_pt);
                        prev_added_points.push(new_pt);
                    }

                    diamond_step = ~diamond_step;
                    step_size -= 1; // decrease step size
                }

                bias -= Math.random() * .1; // decrease the bias for tweaking terrain noise
                diamond_step = ~diamond_step;
                step_size -= 1;
            }

        }



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

            this.vBuffer.push(this.minX + deltaX * j);
            this.vBuffer.push(this.minY + deltaY * i);
            this.vBuffer.push(0); // set the z value to 0 initially for diamond-square

            this.nBuffer.push(0);
            this.nBuffer.push(0);
            this.nBuffer.push(1);
        }
    }

    for (var i = 0; i < this.div; i++) {
        for (var j = 0; j < this.div; j++) {
            var vid = i * (this.div + 1) + j;
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
    this.diamondSquare();
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

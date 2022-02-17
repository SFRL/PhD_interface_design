var sketchCanvas = function (p) {
  "use strict";

  // Class to capture all interaction with the interface
  class InteractionData {
    constructor() {
      this.width = []; // Width of Screen type: int
      this.height = []; // Height of Screen type: int
      this.mouseX = []; // X position of mouse type: int
      this.mouseY = []; // Y position of mouse type: int
      this.time = []; // Timestamp (ms) for action type: float
      this.mouseDown = []; // Is mouse pressed type: boolean
      this.undo = []; // Has undo function been used type: boolean
      this.clear = []; // Has clear function been used type: boolean
      this.length = 0; //Length of data
    }

    update(w, h, x, y, time, down, undo, clear) {
      var i = this.length - 1;
      // Only add new point if something happened
      if (
        w != this.width[i] ||
        h != this.height[i] ||
        x != this.mouseX[i] ||
        y != this.mouseY[i] ||
        down != this.mouseDown[i] ||
        undo != this.undo[i] ||
        clear != this.clear[i]
      ) {
        this.width.push(w);
        this.height.push(h);
        this.mouseX.push(x);
        this.mouseY.push(y);
        this.time.push(time);
        this.mouseDown.push(down);
        this.undo.push(undo);
        this.clear.push(clear);
        this.length++;
      }
    }

    getData() {
      return {
        windowWidth: this.width,
        windowHeight: this.height,
        mouseX: this.mouseX,
        mouseY: this.mouseY,
        time: this.time,
        mouseDown: this.mouseDown,
        undo: this.undo,
        reset: this.clear,
      };
    }
  }

  // Class for whole sketch
  class Sketch {
    constructor(w, h, t) {
      //Array to hold strokes
      this.strokes = [];
      //Dimensions of sketch
      this.width = w;
      this.height = h;
      //Start time of sketch
      this.time = t;
      //Number of strokes
      this.length = 0;
    }
    addStroke(stroke) {
      this.strokes.push(stroke);
      this.length++;
    }
    removeLastStroke() {
      if (this.length > 0) {
        this.strokes.pop(this.length - 1);
        this.length--;
      }
    }
    drawSketch(line_color, line_width, simplified) {
      for (var i = 0; i < this.length; i++) {
        this.strokes[i].drawStroke(line_color, line_width, simplified);
      }
    }

    // format data the same way as Quick, Draw! dataset for export
    getData() {
      var sketch = [];

      for (var i = 0; i < this.length; i++) {
        var stroke = this.strokes[i];
        var x = stroke.x;
        var y = stroke.y;
        var time = stroke.time;
        sketch.push([x, y, time]);
      }
      var sketchData = {
        canvasWidth: this.width,
        canvasHeight: this.height,
        startTime: this.time,
        sketch: sketch,
      };
      return sketchData;
    }

    clearData() {
      // Delete all strokes
      this.strokes = [];
      this.length = 0;
    }
  }

  // Class for individual strokes
  class Stroke {
    constructor(x_, y_, time_) {
      //Original x and y position
      this.x = [x_];
      this.y = [y_];
      //Simplified x and y position
      this.sx = [];
      this.sy = [];
      //Time stamp
      this.time = [time_];
      // Number of all original points
      this.length = 1;
    }

    addPoint(x_, y_, time_) {
      //Only add point if it's at a different location than previous point
      if (x_ != this.x[this.length - 1] || y_ != this.y[this.length - 1]) {
        this.x.push(x_);
        this.y.push(y_);
        this.time.push(time_);
        this.length++;
      }
    }

    simplify(epsilon) {
      var s = simplifyPath(this.x, this.y, epsilon);
      this.sx = s[0];
      this.sy = s[1];
    }

    drawStroke(line_color, line_width, simplified) {
      var l, x, y;
      // Choose between simplified and original points
      if (simplified) {
        l = this.sx.length;
        x = this.sx;
        y = this.sy;
      } else {
        l = this.length;
        x = this.x;
        y = this.y;
      }
      //Draw start point, to visualise stroke arrays of length 1
      p.point(x[0], y[0]);
      p.stroke(line_color);
      p.strokeWeight(line_width);
      p.noFill();
      p.beginShape();
      p.curveVertex(x[0], y[0]);
      for (var i = 0; i < l; i++) {
        p.curveVertex(x[i], y[i]);
      }
      p.curveVertex(x[l - 1], y[l - 1]);
      p.endShape();
    }
  }

  var time; //Time that passed since starting
  var hasStarted = false; // set to true after user starts writing.
  // let x,y; // x and y position on canvas
  // let y_offset; // Offset from the header. Fit Canvas exactely on screen
  var just_finished_line = false;
  var new_stroke = true;

  //Sketch and stroke objects
  var current_stroke;
  p.current_sketch;
  var line_color = p.color(0, 0, 0);
  var line_width = 6;
  p.RDP_tolerance = 0; // Tolerance for simplifciation algorithm

  // Window size
  var screen_width, screen_height;

  // dom
  var canvas;

  // Save interaction data
  var undo = false;
  var clear = false;

  var init = function (cb) {
    // Initialise interaction capture
    p.interactionData = new InteractionData();

    screen_width = get_window_width(); //window.innerWidth
    screen_height = get_window_height(); //window.innerHeight

    // // Clear Canvas
    // document.getElementById("clear").addEventListener("click", function (e) {
    //   // Note that screen has been cleared
    //   clear = true;
    //   reset_button_event();
    // })

    // Undo last stroke
    document.getElementById("undo").addEventListener("click", function () {
      // Note that last stroke has been undone
      undo = true;
      undo_last_stroke();
    });

    var canvas = document.getElementsByTagName("canvas")[0];
    canvas.addEventListener("mousedown", function () {
      devicePressed();
    });
    canvas.addEventListener("mousemove", function (e) {
      deviceMove(e.clientX, e.clientY);
    });
    canvas.addEventListener("mouseup", function (e) {
      deviceReleased();
    });
  };

  // tracking mouse touchpad and time
  var tracking = {
    down: false,
    x: 0,
    y: 0,
    time: 0,
  };

  function restart() {
    // make sure we enforce some minimum size of our demo
    screen_width = Math.max(window.innerWidth, 400);
    screen_height = Math.max(window.innerHeight, 320);
    p.current_sketch.clearData(); // Delete all strokes
    hasStarted = false; // set to true after user starts writing.
  }

  // Clear Screen
  function clear_screen() {
    p.background(255);
  }

  // // Reset Sketches
  // var reset_button_event = function () {
  //   restart();
  //   clear_screen();
  // }

  //Undo last stroke
  var undo_last_stroke = function () {
    if (hasStarted) {
      p.current_sketch.removeLastStroke();
    }
  };

  p.windowResized = function () {
    "use strict";
    screen_width = get_window_width(); //window.innerWidth
    screen_height = get_window_height(); //window.innerHeight

    let y_offset = document.getElementById("navi").offsetHeight;
    p.resizeCanvas(screen_width, screen_height - y_offset);
    if (p.current_sketch) {
      restart();
    }
    clear_screen();
  };

  p.setup = function () {
    init(function () {
      console.log("ready.");
    });

    let y_offset = document.getElementById("navi").offsetHeight;
    canvas = p.createCanvas(screen_width, screen_height - y_offset);
    p.frameRate(30);
    clear_screen();
  };

  // var reset_button_event = function () {
  //   restart();
  //   clear_screen();
  // };

  var deviceReleased = function () {
    tracking.down = false;
  };

  var deviceMove = function (x, y) {
    tracking.x = x;
    tracking.y = y;
    tracking.time = p.millis();
  };

  var devicePressed = function () {
    if (!tracking.down) {
      tracking.down = true;
    }
  };

  // Window Dimensions
  function get_window_width() {
    return window.innerWidth;
  }

  function get_window_height() {
    return window.innerHeight;
  }

  p.draw = function () {
    // record pen drawing from user:
    clear_screen();
    if (
      tracking.down &&
      p.mouseX > 0 &&
      p.mouseX < p.width &&
      p.mouseY > 0 &&
      p.mouseY < p.height
    ) {
      // pen is touching the paper
      if (!hasStarted) {
        // first time anything is written
        // Initialise sketch
        time = tracking.time;
        p.current_sketch = new Sketch(p.width, p.height, time);
        hasStarted = true;
      }

      if (new_stroke == true) {
        // Start new stroke
        current_stroke = new Stroke(p.mouseX, p.mouseY, tracking.time);
        just_finished_line = true;
        new_stroke = false;
      } else {
        // Add point to stroke
        current_stroke.addPoint(p.mouseX, p.mouseY, tracking.time);

        // Simplify in realtime
        if (p.RDP_mode == "real_time") {
          current_stroke.simplify(p.RDP_tolerance);
          // Draw current stroke
          current_stroke.drawStroke(line_color, line_width, true);
        }
        // Don't simplify in realtime
        else {
          current_stroke.drawStroke(line_color, line_width, false);
        }
      }
    } else {
      // pen is above the paper
      if (just_finished_line) {
        // Simplify after stroke is finished
        if (p.RDP_mode == "stroke_end") {
          current_stroke.simplify(p.RDP_tolerance);
        }
        p.current_sketch.addStroke(current_stroke);
        new_stroke = true;
        just_finished_line = false;
      }
    }
    if (hasStarted) {
      // Draw finished strokes
      if (p.RDP_mode == "None") {
        p.current_sketch.drawSketch(line_color, line_width, false);
      } else {
        p.current_sketch.drawSketch(line_color, line_width, true);
      }
    }
    // Update interaction data
    p.interactionData.update(
      screen_width,
      screen_height,
      tracking.x,
      tracking.y,
      tracking.time,
      tracking.down,
      undo,
      clear
    );
    // Reset undo and clear flags
    clear = false;
    undo = false;
  };
};

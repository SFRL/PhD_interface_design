
// Ramer-Douglas-Peucker algorithm 
// from https://gist.github.com/adammiller/826148
// inX = [x0,x1,x2,x3,...,xn]
// inY = [y0,y1,y2,y3,...,yn]
// tol  ... approximation tolerance
// ==============================================
// Copyright 2002, softSurfer (www.softsurfer.com)
// This code may be freely used and modified for any purpose
// providing that this copyright notice is included with it.
// SoftSurfer makes no warranty for this code, and cannot be held
// liable for any real or imagined damage resulting from its use.
// Users of this code must verify correctness for their application.
// http://softsurfer.com/Archive/algorithm_0205/algorithm_0205.htm

var simplifyPath = function (inX,inY, tol) {

    var diff = function(ux,uy,vx,vy) {return [ux-vx, uy-vy];}
    var dot = function(ux,uy,vx,vy) {return ux*vx + uy*vy;}
    var norm2 = function(vx,vy) {return vx*vx + vy*vy;}
    var d2 = function(ux,uy,vx,vy) {var d = diff(ux,uy,vx,vy); return norm2(d[0],d[1]);}

    var simplifyDP = function( tol, x,y, j, k, mk ) {
      //  This is the Douglas-Peucker recursive simplification routine
      //  It just marks vertices that are part of the simplified polyline
      //  for approximating the polyline subchain v[j] to v[k].
      //  mk[] ... array of markers matching vertex array v[]
      if (k <= j+1) { // there is nothing to simplify
        return;
      }
      // check for adequate approximation by segment S from v[j] to v[k]
      var maxi = j;          // index of vertex farthest from S
      var maxd2 = 0;         // distance squared of farthest vertex
      var tol2 = tol * tol;  // tolerance squared
	  var segStart = [x[j], y[j]];  // segment from v[j] to v[k]
	  var segEnd = [x[k],y[k]]
      var u = diff(x[k],y[k],x[j],y[j]);   // segment direction vector
      var cu = norm2(u[0],u[1],u[0],u);     // segment length squared
      // test each vertex v[i] for max distance from S
      // compute using the Feb 2001 Algorithm's dist_Point_to_Segment()
      // Note: this works in any dimension (2D, 3D, ...)
      var  w;           // vector
      var Pb;                // point, base of perpendicular from v[i] to S
      var b, cw, dv2;        // dv2 = distance v[i] to S squared
      for (var i=j+1; i<k; i++) {
        // compute distance squared
        w = diff(x[i],y[i], segStart[0], segStart[1]);
        cw = dot(w[0],w[1],u[0],u[1]);
        if ( cw <= 0 ) {
          dv2 = d2(x[i],y[i], segStart[0], segStart[1]);
        } else if ( cu <= cw ) {
          dv2 = d2(x[i],y[i], segEnd[0], segEnd[1]);
        } else {
          b = cw / cu;
		  Pbx = segStart[0]+b*u[0];
		  Pby = segStart[1]+b*u[1];
          dv2 = d2(x[i],y[i],Pbx,Pby);
        }
        // test with current max distance squared
        if (dv2 <= maxd2) {
          continue;
        }
        // v[i] is a new max vertex
        maxi = i;
        maxd2 = dv2;
      }
      if (maxd2 > tol2) {      // error is worse than the tolerance
        // split the polyline at the farthest vertex from S
        mk[maxi] = 1;      // mark v[maxi] for the simplified polyline
        // recursively simplify the two subpolylines at v[maxi]
        simplifyDP( tol, x,y, j, maxi, mk );  // polyline v[j] to v[maxi]
        simplifyDP( tol, x,y, maxi, k, mk );  // polyline v[maxi] to v[k]
      }
      // else the approximation is OK, so ignore intermediate vertices
      return;
    }

    var n = inX.length;
	var sX = [];
	var sY = [];
    var i, k, m, pv;               // misc counters
    var tol2 = tol * tol;          // tolerance squared
	var inx = [];
	var iny = [];                       // vertex buffer, points
    var mk = [];                       // marker buffer, ints

    // STAGE 1.  Vertex Reduction within tolerance of prior vertex cluster
	inx[0] = inX[0];              // start at the beginning
	iny[0] = inY[0];
    for (i=k=1, pv=0; i<n; i++) {
      if (d2(inX[i],inY[i],inX[pv],inY[pv]) < tol2) {
        continue;
      }
	  inx[k] = inX[i];
	  iny[k] = inY[i];
	  k++
      pv = i;
    }
    if (pv < n-1) {
	  inx[k] = inX[n-1];      // finish at the end
	  iny[k] = inY[n-1];
	  k++;
    }

    // STAGE 2.  Douglas-Peucker polyline simplification
    mk[0] = mk[k-1] = 1;       // mark the first and last vertices
    simplifyDP( tol, inx, iny, 0, k-1, mk );

    // copy marked vertices to the output simplified polyline
    for (i=m=0; i<k; i++) {
      if (mk[i]) {
		sX[m] = inx[i];
		sY[m] = iny[i];
		m++;
      }
    }
    return [sX,sY];
  }
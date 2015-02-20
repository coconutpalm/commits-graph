"use strict";

/*

[
  sha,
  [offset, branch], //dot
  [
    [from, to, branch],  // route1
    [from, to, branch],  // route2
    [from, to, branch],
  ]  // routes
],

*/


;( function ($, window) {

// -- Route --------------------------------------------------------
    function Route(commit, data, options) {
        this._data = data;
        this.commit = commit;
        this.options = options._data;
        this.from = data[0];
        this.to = data[1];
        this.branch = data[2];
    }

    Route.prototype.drawRoute = function (ctx) {
        if (this.options.orientation === "horizontal") {
            var from_x_hori = this.options.width * this.options.scaleFactor - (this.commit.idx + 0.5) * this.options.x_step * this.options.scaleFactor;
            var from_y_hori = (this.from + 1) * this.options.y_step * this.options.scaleFactor;

            var to_x_hori = this.options.width * this.options.scaleFactor - (this.commit.idx + 0.5 + 1) * this.options.x_step * this.options.scaleFactor;
            var to_y_hori = (this.to + 1) * this.options.y_step * this.options.scaleFactor;

            ctx.strokeStyle = this.commit.graph.get_color(this.branch);
            ctx.beginPath();
            ctx.moveTo(from_x_hori, from_y_hori);

            if (from_y_hori === to_y_hori) {
              ctx.lineTo(to_x_hori, to_y_hori);
            } else if (from_y_hori > to_y_hori) {
                ctx.bezierCurveTo(
                    from_x_hori - this.options.x_step * this.options.scaleFactor / 3 * 2,
                    from_y_hori + this.options.y_step * this.options.scaleFactor / 4,
                    to_x_hori + this.options.x_step * this.options.scaleFactor / 3 * 2,
                    to_y_hori - this.options.y_step * this.options.scaleFactor / 4,
                    to_x_hori, to_y_hori
                );
            } else if (from_y_hori < to_y_hori) {
                ctx.bezierCurveTo(
                    from_x_hori - this.options.x_step * this.options.scaleFactor / 3 * 2,
                    from_y_hori - this.options.y_step * this.options.scaleFactor / 4,
                    to_x_hori + this.options.x_step * this.options.scaleFactor / 3 * 2,
                    to_y_hori + this.options.y_step * this.options.scaleFactor / 4,
                    to_x_hori, to_y_hori
                );
            }
        } else {
            var from_x = this.options.width * this.options.scaleFactor - (this.from + 1) * this.options.x_step * this.options.scaleFactor;
            var from_y = (this.commit.idx + 0.5) * this.options.y_step * this.options.scaleFactor;

            var to_x = this.options.width * this.options.scaleFactor - (this.to + 1) * this.options.x_step * this.options.scaleFactor;
            var to_y = (this.commit.idx + 0.5 + 1) * this.options.y_step * this.options.scaleFactor;

            ctx.strokeStyle = this.commit.graph.get_color(this.branch);
            ctx.beginPath();
            ctx.moveTo(from_x, from_y);

            if (from_x === to_x) {
              ctx.lineTo(to_x, to_y);
            } else {
                ctx.bezierCurveTo(
                    from_x - this.options.x_step * this.options.scaleFactor / 4,
                    from_y + this.options.y_step * this.options.scaleFactor / 3 * 2,
                    to_x + this.options.x_step * this.options.scaleFactor / 4,
                    to_y - this.options.y_step * this.options.scaleFactor / 3 * 2,
                    to_x, to_y
                );
            }
        }

        ctx.stroke();
    };

// -- Commit Node --------------------------------------------------------
    function Commit(graph, idx, data, options) {
        this._data = data;
        this.graph = graph;
        this.options = options;
        this.idx = idx;
        this.sha = data[0];
        this.dot = data[1];
        this.dot_offset = this.dot[0];
        this.dot_branch = this.dot[1];

        var self = this;
        this.routes = $.map(data[2], function(e) { return new Route(self, e, options); });
    }

    Commit.prototype.getDrawCoordinates = function() {
        var width = this.options.get("width");
        var scaleFactor = this.options.get("scaleFactor");
        var x_step = this.options.get("x_step");
        var y_step = this.options.get("y_step");

        var x, y;

        if (this.options.get("orientation") === "horizontal") {
            x = width * scaleFactor - (this.idx + 0.5) * x_step * scaleFactor;
            y = (this.dot_offset + 1) * y_step * scaleFactor;
        } else {
            x = width * scaleFactor - (this.dot_offset + 1) * x_step * scaleFactor;
            y = (this.idx + 0.5) * y_step * scaleFactor;
        }

        return { "x": x, "y": y };
    };

    Commit.prototype.drawDot = function (ctx) {
        var radius = this.options.get("dotRadius");
        var scaleFactor = this.options.get("scaleFactor");
        var dotCoords = this.getDrawCoordinates();

        ctx.fillStyle = this.graph.get_color(this.dot_branch);
        ctx.beginPath();
        ctx.arc(dotCoords.x, dotCoords.y, radius * scaleFactor, 0, 2 * Math.PI, true);
        ctx.fill();
    };

// -- Function for finding the total number of branches -----------------------
    var branchCount = function(data) {
        var maxBranch = -1;
        for (var i = 0; i < data.length; i += 1) {
            for (var j = 0; j < data[i][2].length; j += 1) {
                if (maxBranch < data[i][2][j][0] || maxBranch < data[i][2][j][1]) {
                    maxBranch = Math.max.apply(Math, [data[i][2][j][0], data[i][2][j][1]]);
                }
            }
        }
        return maxBranch + 1;
    };


// -- Graph Canvas --------------------------------------------------------

    function backingScale() {
        if ("devicePixelRatio" in window) {
            if (window.devicePixelRatio > 1) {
                return window.devicePixelRatio;
            }
        }
        return 1;
    }

    function GraphCanvas(data, options) {

        this.data = data;
        this.options = options;
        this.canvas = document.createElement("canvas");

        if (this.options.get("autoSizeAdjustment") === true) {
            this.adjustSizeToContent(data);
        }

        this.colors = [
            "#e11d21",
            "#eb6420",
            "#fbca04",
            "#009800",
            "#006b75",
            "#207de5",
            "#0052cc",
            "#5319e7",
            "#f7c6c7",
            "#fad8c7",
            "#fef2c0",
            "#bfe5bf",
            "#c7def8",
            "#bfdadc",
            "#bfd4f2",
            "#d4c5f9",
            "#cccccc",
            "#84b6eb",
            "#e6e6e6",
            "#ffffff",
            "#cc317c"
        ];
    }

    GraphCanvas.prototype.adjustSizeToContent = function (data) {
        var scaleFactor = backingScale();

        var additionalLength = 1;
        var additionalWidth = 0.5;

        var newWidth, newHeight;

        var longerSide = data.length + additionalLength;
        var shorterSide = branchCount(data) + additionalWidth;

        if (this.options.get("orientation") === "horizontal") {
            newWidth = longerSide * this.options.get("x_step") * scaleFactor;
            newHeight = shorterSide * this.options.get("y_step") * scaleFactor;
        } else {
            newWidth = shorterSide * this.options.get("x_step") * scaleFactor;
            newHeight = longerSide * this.options.get("y_step") * scaleFactor;
        }

        this.options.setWidth(newWidth)
                    .setHeight(newHeight)
                    .setScaleFactor(scaleFactor);

        this.canvas.style.height = newHeight + "px";
        this.canvas.style.width = newWidth + "px";
        this.canvas.height = newHeight;
        this.canvas.width = newWidth;
    };

    GraphCanvas.prototype.toHTML = function () {
        this.draw();

        return $(this.canvas);
    };

    GraphCanvas.prototype.get_color = function (branch) {
        var n = this.colors.length;
        return this.colors[branch % n];
    };

    // draw
    GraphCanvas.prototype.draw = function () {
        var ctx = this.canvas.getContext("2d");

        ctx.lineWidth = this.options.get("lineWidth");

        var n_commits = this.data.length;

        //build commits array
        var commits = [];

        for (var i = 0; i < n_commits; i += 1) {
            commits.push(new Commit(this, i, this.data[i], this.options));
        }

        var commit;

        // draw only lines
        for (i = 0; i < n_commits; i += 1) {
            commit = commits[i];
            for (var j = 0; j < commit.routes.length; j +=1 ) {
                var route = commit.routes[j];
                route.drawRoute(ctx);
            }
        }

        // drow dots over lines
        for (i = 0; i < n_commits; i += 1) {
            commits[i].drawDot(ctx);
        }
    };

// -- Graph Plugin ------------------------------------------------------------

    function Graph(data, options) {
        this.data = data;
        this.options = options;
    }

    Graph.prototype.applyOn = function (container) {
        var graphCanvas = new GraphCanvas(this.data, this.options);
        var $canvas = graphCanvas.toHTML();

        $canvas.appendTo(container);
    };

// -- Options
    function Options(options) {
        this._defaults = {
            autoSizeAdjustment: true,
            height: 800,
            width: 200,
            y_step: 20,
            x_step: 20,
            orientation: "vertical",
            dotRadius: 3,
            lineWidth: 2,
        };

        this._data = this._defaults;

        $.extend(this._data, options);
    }

    Options.prototype.get = function (name) {
        return this._data[name];
    };

    Options.prototype.setWidth = function (value) {
        this._data.width = value;
        return this;
    };

    Options.prototype.setHeight = function (value) {
        this._data.height = value;
        return this;
    };

    Options.prototype.setScaleFactor = function (value) {
        this._data.scaleFactor = value;
        return this;
    };

// -- Attach plugin to jQuery's prototype --------------------------------------
    $.fn.commits = function (config) {
        return this.each(function () {
            if (!$(this).data("plugin_commits_graph")) {

                this.$container = $(this);

                var data = this.$container.data("graph");
                var options = new Options(config);
                var graph = new Graph(data, options).applyOn(this.$container);

                $(this).data("plugin_commits_graph", graph);
            }
        });
    };

}(window.jQuery, window));

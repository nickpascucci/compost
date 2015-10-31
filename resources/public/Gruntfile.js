module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      build: {
        src: 'src/<%= pkg.name %>.js',
        dest: 'build/<%= pkg.name %>.min.js'
      }
    },
    jshint: {
        all: ['Gruntfile.js', '<%= concat.dist.src %>']
    },
    concat: {
      options: {
        stripBanners: false,
        banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
          '<%= grunt.template.today("yyyy-mm-dd") %> */\n',
      },
      dist: {
          src: ['js_src/util.js',
                'js_src/services.js',
                'js_src/controllers.js',
                'js_src/components/**/*.js',
                'js_src/app.js'],
          dest: 'js/compost-min.js',
      },
    },
    notify: {
      success: {
        options: {
          title: "Grunt Finished",
          message: "All tasks completed"
        }
      }
    },
    watch: {
      files: ['<%= jshint.all %>'],
      tasks: ['jshint', 'concat', 'notify:success']
    }
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-notify');

  grunt.registerTask('default', ['jshint', 'concat', 'notify']);

};

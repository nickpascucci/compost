module.exports = function(grunt) {

  // Project configuration.
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
      all: ['Gruntfile.js', 'js_src/**/*.js']
    },
    concat: {
      options: {
        stripBanners: true,
        banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
          '<%= grunt.template.today("yyyy-mm-dd") %> */\n',
      },
      dist: {
        src: ['js_src/**/*.js'],
        dest: 'js/compost.js',
      },
    },
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-uglify');

  grunt.loadNpmTasks('grunt-contrib-concat');

  grunt.loadNpmTasks('grunt-contrib-jshint');

  // Default task(s).
  grunt.registerTask('default', ['jshint', 'concat']);

};

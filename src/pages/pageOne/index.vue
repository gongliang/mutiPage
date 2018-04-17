<template>
  <div id="app">
    i am b
    <img src="../../assets/logo.png">
    <div class="content">哈哈哈
      <div class="icon"></div>
    </div>
    <router-view/>
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style lang="scss">
@import '../../assets/css/_pageOne_icon.scss';

#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
    .content {
      color: red;
      .lab {
        transform: translate(0, 0, 0);
      }
      .icon {
        @include sprite($title_bg)
      }
    }
}
</style>

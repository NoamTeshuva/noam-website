import React from 'react';

function App() {
  return (
    <div>
      <header>
        <h1>Noam Teshuva</h1>
        <p>B.Sc. in Computer Science and Mathematics | Software Developer</p>
      </header>

      <main>
        <section id="about">
          <h2>About Me</h2>
          <p>I am a passionate developer with experience in React, Python, and cloud technologies. I'm excited to build innovative solutions and share my work.</p>
        </section>

        <section id="projects">
          <h2>Projects</h2>
          <ul>
            <li><a href="https://github.com/NoamTeshuva/project1">Project 1</a></li>
            <li><a href="https://github.com/NoamTeshuva/project2">Project 2</a></li>
          </ul>
        </section>

        <section id="contact">
          <h2>Contact</h2>
          <p>Email: <a href="mailto:Teshuva91@gmail.com">Teshuva91@gmail.com</a></p>
        </section>
      </main>

      <footer>
        <p>&copy; 2025 Noam Teshuva. All Rights Reserved.</p>
      </footer>
    </div>
  );
}

export default App;

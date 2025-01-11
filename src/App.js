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
          <p>I'm a passionate developer with experience in React, Python, and cloud technologies.</p>
        </section>

        <section id="projects">
          <h2>Projects</h2>
          <ul>
            <li><a href="https://github.com/Teshuva91/project1">Project 1</a></li>
            <li><a href="https://github.com/Teshuva91/project2">Project 2</a></li>
          </ul>
        </section>

        <section id="contact">
          <h2>Contact</h2>
          <p>Email: Teshuva91@gmail.com</p>
        </section>
      </main>

      <footer>
        <p>&copy; 2025 Noam Teshuva. All Rights Reserved.</p>
      </footer>
    </div>
  );
}

export default App;

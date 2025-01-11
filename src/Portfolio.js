import React from 'react';
import { Github, Linkedin, Mail, ExternalLink, FileText } from 'lucide-react';

const Portfolio = () => {
  // Replace these with your actual information
  const personalInfo = {
    name: "Noam Teshuva",
    title: "B.Sc. in Computer Science and Mathematics",
    about: "I'm a passionate developer with experience in React, Python, and cloud technologies.",
    github: "https://github.com/NoamTeshuva",
    linkedin: "www.linkedin.com/in/noam-teshuva-452101221",
    email: "Teshuva91@gmail.com",
    resume: "/NoamTeshuvaResume.pdf"
};

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-800">{personalInfo.name}</h1>
            <div className="space-x-4">
              <a href="#about" className="text-gray-600 hover:text-gray-900">About</a>
              <a href="#projects" className="text-gray-600 hover:text-gray-900">Projects</a>
              <a href="#contact" className="text-gray-600 hover:text-gray-900">Contact</a>
              <a href={personalInfo.resume} download className="text-gray-600 hover:text-gray-900">
                <FileText className="inline mr-1" size={18} /> Resume
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-white">
        <div className="max-w-5xl mx-auto px-4 py-20">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{personalInfo.name}</h1>
            <p className="text-xl text-gray-600 mb-8">{personalInfo.title}</p>
            <div className="flex justify-center space-x-4">
              <a
                href={personalInfo.github}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-600 hover:text-gray-900"
              >
                <Github size={24} />
              </a>
              <a
                href={personalInfo.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-600 hover:text-gray-900"
              >
                <Linkedin size={24} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* About Section */}
      <section id="about" className="py-20">
  <div className="max-w-5xl mx-auto px-4">
    <h2 className="text-3xl font-bold text-gray-900 mb-8">About Me</h2>
    <p className="text-lg text-gray-600 leading-relaxed">
      Passionate and detail-oriented Computer Science and Mathematics graduate with a solid foundation in software development, cloud platforms, and automation tools.
    </p>
    <p className="text-lg text-gray-600 leading-relaxed">
      Experienced in leveraging data analysis and DevOps methodologies to optimize systems and build innovative solutions.
    </p>
  </div>
</section>


      {/* Projects Section */}
      <section id="projects" className="bg-white py-20">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Project Card Example */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold mb-2">Project Name</h3>
              <p className="text-gray-600 mb-4">
                Description of your project. Explain what you built and what technologies you used.
              </p>
              <div className="flex items-center space-x-4">
                <a
                  href="https://github.com/NoamTeshuva/project1"
                  className="text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <Github className="mr-1" size={16} />
                  View Code
                </a>
                <a
                  href="https://noamteshuva.com"
                  className="text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <ExternalLink className="mr-1" size={16} />
                  Live Demo
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

{/* Contact Section */}
<section id="contact" className="py-20">
  <div className="max-w-5xl mx-auto px-4">
    <h2 className="text-3xl font-bold text-gray-900 mb-8">Contact</h2>
    <div className="flex flex-col items-center space-y-6">
      {/* Email */}
      <a 
        href={`mailto:${personalInfo.email}`}
        className="flex items-center text-gray-600 hover:text-gray-900"
      >
        <Mail className="mr-2" size={20} />
        {personalInfo.email}
      </a>

      {/* Phone */}
      <a 
        href="tel:+972542433401"
        className="flex items-center text-gray-600 hover:text-gray-900"
      >
        <ExternalLink className="mr-2" size={20} />
        054-2433401
      </a>
    </div>
  </div>
</section>


      {/* Footer */}
      <footer className="bg-white py-8">
        <div className="max-w-5xl mx-auto px-4 text-center text-gray-600">
          <p>© {new Date().getFullYear()} {personalInfo.name}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Portfolio;

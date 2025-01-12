import React from 'react';
import { Github, Linkedin, Mail, ExternalLink, FileText, Phone } from 'lucide-react';

const Portfolio = () => {
  // Image path pointing to public folder

  const personalInfo = {
    name: "Noam Teshuva",
    title: "B.Sc. in Computer Science and Mathematics",
    about: `
      I'm a passionate developer with a strong foundation in computer science and mathematics. 
      I have hands-on experience with Python, Java, C, and JavaScript, and I'm proficient in frameworks like React.js and tools like PyTorch for deep learning. 
      My skill set includes data analysis, machine learning, and backend development with cloud technologies such as AWS and Docker. 
      I'm capable of handling both frontend and backend tasks, building end-to-end systems, and delivering impactful data insights.
    `,
    github: "https://github.com/NoamTeshuva",
    linkedin: "https://www.linkedin.com/in/noam-teshuva-452101221",
    email: "Teshuva91@gmail.com",
    phone: "054-2433401",
    resume: "/NoamTeshuvaResume.pdf",
    photo: "/profile-photo.png"
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
        <a href="/NoamTeshuvaResume.pdf" 
           target="_blank" 
           rel="noopener noreferrer" 
           className="text-gray-600 hover:text-gray-900 inline-flex items-center">
          <FileText className="mr-1" size={18} />
          resume
        </a>
      </div>
    </div>
  </div>
</nav>


     {/* Hero Section */}
<div className="bg-white">
  <div className="max-w-5xl mx-auto px-4 py-20">
    <div className="text-center">
      {/* Profile Photo */}
      <div className="relative w-40 h-40 mx-auto mb-8">
        <img
          src="/profile-photo.png"
          className="rounded-full w-full h-full object-cover shadow-lg"
        />
      </div>

      {/* Name and Title */}
      <h1 className="text-4xl font-bold text-gray-900 mb-4">{personalInfo.name}</h1>
      <p className="text-xl text-gray-600 mb-8">{personalInfo.title}</p>

      {/* Social Buttons */}
      <div className="flex justify-center space-x-4">
        {/* GitHub Button */}
        <a
          href={personalInfo.github}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-gray-600 hover:text-gray-900"
        >
          <Github size={24} />
        </a>

        {/* LinkedIn Button */}
        <a
          href={personalInfo.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-gray-600 hover:text-gray-900"
        >
          <Linkedin size={24} />
        </a>

        {/* Gmail Button */}
        <a
          href={`mailto:${personalInfo.email}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-gray-600 hover:text-red-600"
        >
          <Mail size={24} />
        </a>
      </div>
    </div>
  </div>
</div>

      {/* Rest of the sections remain the same */}
     {/* About Section */}
<section id="about" className="py-20">
  <div className="max-w-5xl mx-auto px-4">
    <h2 className="text-3xl font-bold text-gray-900 mb-8">About Me</h2>
    <div className="space-y-4">
      <p className="text-lg text-gray-600 leading-relaxed">
        I'm a passionate and detail-oriented Computer Science and Mathematics graduate with a solid foundation in software development, cloud platforms, and automation tools. I strive to build efficient, scalable systems and solve complex problems.
      </p>
      <p className="text-lg text-gray-600 leading-relaxed">
        🔧 <strong>Programming Languages:</strong> Python, Java, C, JavaScript.
      </p>
      <p className="text-lg text-gray-600 leading-relaxed">
        📊 <strong>Data & Machine Learning:</strong> Experienced in data analysis, building deep learning models, binary classification, and utilizing frameworks like PyTorch.
      </p>
      <p className="text-lg text-gray-600 leading-relaxed">
        🌐 <strong>Cloud & DevOps Tools:</strong> Familiar with AWS, Docker, and Git, with experience deploying scalable solutions in cloud environments.
      </p>
      <p className="text-lg text-gray-600 leading-relaxed">
        🖥️ <strong>Frontend & Backend Development:</strong> Proficient in React.js for frontend development and experienced in backend development using server-side programming, building end-to-end systems, and delivering impactful data insights.
      </p>
    </div>
  </div>
</section>


    {/* Projects Section */}
<section id="projects" className="bg-white py-20">
  <div className="max-w-5xl mx-auto px-4">
    <h2 className="text-3xl font-bold text-gray-900 mb-8">Projects</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

      {/* Deep Learning Project */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-2">Deep Learning Course Project</h3>
        <p className="text-gray-600 mb-4">
          Developed and optimized various neural network architectures, including CNNs (with MobileNetV2 and ResNet), RNNs, Multilayer Neural Networks, and Logistic Regression models. Explored different approaches to improve model performance. Focused on binary classification using PyTorch.
        </p>
        <div className="flex items-center space-x-4">
          <a
            href="https://github.com/NoamTeshuva/DeepLearningProject/tree/main"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <Github className="mr-1" size={16} />
            View Code
          </a>
          <a
            href="https://noamteshuva.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <ExternalLink className="mr-1" size={16} />
            Live Demo
          </a>
        </div>
      </div>

      {/* Operating Systems Project */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-2">Operating Systems Course Project</h3>
        <p className="text-gray-600 mb-4">
          Designed a multi-client server in C using the Miller-Rabin primality test to identify prime numbers. Implemented advanced OS concepts, including polling, proactor patterns, and producer-consumer models for efficient handling of client requests. Focused on multi-threading, process synchronization, and shared memory to optimize server responsiveness and performance.
        </p>
        <div className="flex items-center space-x-4">
          <a
            href="https://github.com/NoamTeshuva/os_final_project"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <Github className="mr-1" size={16} />
            View Code
          </a>
          <a
            href="https://noamteshuva.com"
            target="_blank"
            rel="noopener noreferrer"
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
            <a 
              href={`mailto:${personalInfo.email}`}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <Mail className="mr-2" size={20} />
              {personalInfo.email}
            </a>
            <a 
              href={`tel:+972${personalInfo.phone}`}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <Phone className="mr-2" size={20} />
              {personalInfo.phone}
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
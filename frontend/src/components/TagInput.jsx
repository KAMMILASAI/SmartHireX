import React, { useState, useEffect, useRef } from 'react';
import { commonSkills } from '../data/skills';
import './TagInput.css';

const TagInput = ({ tags: propTags = [], setTags }) => {
  // Ensure tags is always an array
  const tags = Array.isArray(propTags) ? propTags : (propTags ? [propTags] : []);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const containerRef = useRef(null);

    useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

    const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    if (value) {
      const lowercasedTags = tags.map(t => t?.toString().toLowerCase() || '');
      const filteredSuggestions = Array.isArray(commonSkills) ? 
        commonSkills.filter(skill => {
          const skillStr = skill?.toString().toLowerCase() || '';
          return skillStr.includes(value.toLowerCase()) &&
                 !lowercasedTags.includes(skillStr);
        }) : [];
      setSuggestions(filteredSuggestions);
    } else {
      setSuggestions([]);
    }
  };

      const addTag = (tag) => {
    if (!tag) return;
    const newTag = tag.toString().trim();
    if (newTag && !tags.some(t => t?.toString().toLowerCase() === newTag.toLowerCase())) {
      setTags([...tags, newTag]);
      setInputValue('');
      setSuggestions([]);
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0 && activeSuggestion < suggestions.length) {
        addTag(suggestions[activeSuggestion]);
      } else {
        addTag(inputValue);
      }
      setActiveSuggestion(0);
    } else if (e.key === 'ArrowDown') {
      setActiveSuggestion(prev => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      setActiveSuggestion(prev => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === ',' && inputValue.trim()) {
        e.preventDefault();
        addTag(inputValue.trim().replace(/,/g, ''));
    }
  };

  const removeTag = (tagToRemove) => {
    if (!tagToRemove) return;
    setTags(tags.filter(tag => tag?.toString() !== tagToRemove?.toString()));
  };

  return (
        <div className="tag-input-container" ref={containerRef}>
      {tags.map((tag, index) => (
        <div key={index} className="tag-item">
          {tag}
          <button type="button" className="remove-tag-button" onClick={() => removeTag(tag)}>&times;</button>
        </div>
      ))}
      <input
        type="text"
        className="tag-input"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleInputKeyDown}
        placeholder="Type a skill and press Enter"
            />
      {suggestions.length > 0 && (
        <ul className="suggestions-list">
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion}
              className={index === activeSuggestion ? 'suggestion-active' : ''}
              onClick={() => addTag(suggestion)}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TagInput;

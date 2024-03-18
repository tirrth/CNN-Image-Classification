from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
import os
import time
import requests

def init_driver(headless=False):
    chrome_options = Options()
    if headless:
        chrome_options.add_argument('--headless')
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    return driver

def download_image(url, save_dir, image_number):
    try:
        response = requests.get(url, timeout=30)
        if response.status_code == 200:
            # Use image_number to name the file
            filename = os.path.join(save_dir, f'python_image_{image_number}.jpg')
            with open(filename, 'wb') as f:
                f.write(response.content)
            print(f'Downloaded: {filename}')
    except Exception as e:
        print(f'Failed to download {url}: {e}')

def collect_and_download_images(driver, search_term, num_images, save_dir):
    if not os.path.exists(save_dir):
        os.makedirs(save_dir)
        
    search_url = f'https://www.google.com/search?hl=en&tbm=isch&q={search_term}'
    driver.get(search_url)

    collected_images = 0
    while collected_images < num_images:
        driver.execute_script('window.scrollTo(0, document.body.scrollHeight);')
        time.sleep(2)
        thumbnails = WebDriverWait(driver, 10).until(
            EC.presence_of_all_elements_located((By.CSS_SELECTOR, 'img.Q4LuWd'))
        )
        
        for img in thumbnails[collected_images:num_images]:
            try:
                img.click()
                time.sleep(1)
                images = WebDriverWait(driver, 10).until(
                    EC.presence_of_all_elements_located((By.CSS_SELECTOR, 'img.iPVvYb'))
                )
                for image in images:
                    src = image.get_attribute('src')
                    if src.startswith('http') and src not in save_dir:
                        collected_images += 1
                        # Now pass collected_images as the image number to download_image
                        download_image(src, save_dir, collected_images)
                        if collected_images == num_images:
                            return
            except Exception as e:
                print(f'Error: {e}')

def main():
    driver = init_driver(headless=False)
    dataset_dir = os.path.join(os.getcwd(), 'images/dataset')
    
    try:
        terms = ['5 dollar US bill', '10 dollar US bill', '50 dollar US bill']
        for term in terms:
            print(f'Collecting images for: {term}')
            term_dir = os.path.join(dataset_dir, term.replace(' ', '_'))
            collect_and_download_images(driver, term, 1, term_dir)  # Set the number of images you want to collect
    finally:
        driver.quit()

if __name__ == '__main__':
    main()
